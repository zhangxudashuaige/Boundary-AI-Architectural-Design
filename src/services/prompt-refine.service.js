const { logger } = require('../config/logger');
const { env } = require('../config/env');

const PROMPT_REFINE_STRATEGY = 'rule-based-architectural-v1';

const DEFAULT_ATTRIBUTES = Object.freeze({
  buildingType: 'architectural exterior',
  styles: ['contemporary architectural design'],
  materials: ['exposed concrete', 'floor-to-ceiling glass', 'natural stone'],
  lighting: 'soft natural daylight',
  photography:
    'wide-angle architectural photography, eye-level composition, corrected vertical lines',
  realism:
    'photorealistic architectural rendering, highly detailed, realistic material textures, natural shadows, global illumination'
});

const BUILDING_TYPE_RULES = [
  {
    value: 'architectural interior space',
    patterns: [
      /\binterior\b/i,
      /\blobby\b/i,
      /\bliving room\b/i,
      /\bbedroom\b/i,
      /\bdining room\b/i,
      /\bkitchen\b/i,
      /\bworkspace\b/i,
      /\bshowroom\b/i,
      /室内/,
      /客厅/,
      /卧室/,
      /餐厅/,
      /厨房/,
      /大堂/,
      /展厅/,
      /办公空间/
    ]
  },
  {
    value: 'villa residence',
    patterns: [/\bvilla\b/i, /\bmanor\b/i, /别墅/, /独栋/, /私宅/]
  },
  {
    value: 'private residential house',
    patterns: [/\bhouse\b/i, /\bhome\b/i, /住宅/, /自建房/, /民居/]
  },
  {
    value: 'apartment building',
    patterns: [/\bapartment\b/i, /\bcondo\b/i, /公寓/, /住宅楼/, /高层住宅/]
  },
  {
    value: 'high-rise tower',
    patterns: [/\btower\b/i, /\bskyscraper\b/i, /塔楼/, /摩天楼/, /超高层/]
  },
  {
    value: 'office building',
    patterns: [/\boffice\b/i, /\bworkplace\b/i, /办公楼/, /写字楼/, /总部/]
  },
  {
    value: 'hotel building',
    patterns: [/\bhotel\b/i, /\bresort\b/i, /酒店/, /度假酒店/, /民宿/]
  },
  {
    value: 'commercial building',
    patterns: [/\bmall\b/i, /\bretail\b/i, /\bcommercial\b/i, /商业/, /购物中心/]
  },
  {
    value: 'museum pavilion',
    patterns: [/\bmuseum\b/i, /\bgallery\b/i, /\bpavilion\b/i, /博物馆/, /美术馆/, /展馆/]
  },
  {
    value: 'educational building',
    patterns: [/\bschool\b/i, /\bcampus\b/i, /\blibrary\b/i, /学校/, /校园/, /图书馆/]
  },
  {
    value: 'healthcare building',
    patterns: [/\bhospital\b/i, /\bclinic\b/i, /医院/, /诊所/]
  },
  {
    value: 'hospitality space',
    patterns: [/\brestaurant\b/i, /\bcafe\b/i, /\bbar\b/i, /餐厅/, /咖啡/, /酒吧/]
  },
  {
    value: 'architectural facade',
    patterns: [/\bfacade\b/i, /\belevation\b/i, /外立面/, /立面/]
  }
];

const STYLE_RULES = [
  {
    value: 'modern contemporary',
    patterns: [/\bmodern\b/i, /\bcontemporary\b/i, /现代/, /当代/]
  },
  {
    value: 'minimalist',
    patterns: [/\bminimal/i, /\bclean lines\b/i, /极简/, /简约/]
  },
  {
    value: 'luxury contemporary',
    patterns: [/\bluxury\b/i, /\bpremium\b/i, /轻奢/, /豪宅/, /高级感/]
  },
  {
    value: 'brutalist',
    patterns: [/\bbrutalist\b/i, /粗野主义/]
  },
  {
    value: 'industrial',
    patterns: [/\bindustrial\b/i, /工业风/]
  },
  {
    value: 'wabi-sabi',
    patterns: [/\bwabi\b/i, /侘寂/]
  },
  {
    value: 'Japanese-inspired',
    patterns: [/\bjapanese\b/i, /日式/]
  },
  {
    value: 'Nordic',
    patterns: [/\bnordic\b/i, /北欧/]
  },
  {
    value: 'Chinese contemporary',
    patterns: [/\bchinese\b/i, /中式/, /新中式/]
  },
  {
    value: 'Mediterranean',
    patterns: [/\bmediterranean\b/i, /地中海/]
  },
  {
    value: 'classical European',
    patterns: [/\bclassical\b/i, /\beuropean\b/i, /欧式/, /古典/]
  }
];

const MATERIAL_RULES = [
  {
    value: 'exposed concrete',
    patterns: [/\bconcrete\b/i, /混凝土/, /清水混凝土/]
  },
  {
    value: 'floor-to-ceiling glass',
    patterns: [/\bglass\b/i, /\bglazing\b/i, /玻璃/, /幕墙/]
  },
  {
    value: 'warm wood cladding',
    patterns: [/\bwood\b/i, /\btimber\b/i, /木格栅/, /木饰面/, /木材/, /木质/]
  },
  {
    value: 'natural stone',
    patterns: [/\bstone\b/i, /\btravertine\b/i, /\bmarble\b/i, /石材/, /石头/, /大理石/]
  },
  {
    value: 'metal detailing',
    patterns: [/\bmetal\b/i, /\bsteel\b/i, /\baluminum\b/i, /金属/, /钢材/, /铝板/]
  },
  {
    value: 'textured brick',
    patterns: [/\bbrick\b/i, /砖/]
  },
  {
    value: 'smooth light plaster',
    patterns: [/\bstucco\b/i, /\bplaster\b/i, /\bwhite wall\b/i, /白墙/, /涂料/]
  }
];

const LIGHTING_RULES = [
  {
    value: 'warm golden-hour sunset lighting',
    patterns: [/\bsunset\b/i, /\bdusk\b/i, /\bgolden hour\b/i, /黄昏/, /日落/, /夕阳/]
  },
  {
    value: 'soft sunrise lighting',
    patterns: [/\bsunrise\b/i, /\bdawn\b/i, /清晨/, /黎明/]
  },
  {
    value: 'cinematic night lighting',
    patterns: [/\bnight\b/i, /\bevening scene\b/i, /夜景/, /夜晚/]
  },
  {
    value: 'soft overcast daylight',
    patterns: [/\bovercast\b/i, /\bcloudy\b/i, /阴天/, /多云/]
  },
  {
    value: 'crisp morning daylight',
    patterns: [/\bmorning\b/i, /晨光/, /上午/]
  },
  {
    value: 'warm evening light',
    patterns: [/\bevening\b/i, /傍晚/]
  }
];

const PHOTOGRAPHY_HINTS = {
  aerial: [/\baerial\b/i, /\bdrone\b/i, /\bbird'?s-eye\b/i, /鸟瞰/, /航拍/],
  closeUp: [/\bdetail\b/i, /\bclose-up\b/i, /\bclose up\b/i, /特写/, /局部/],
  eyeLevel: [/\beye-level\b/i, /\bstreet view\b/i, /人视/, /街景/]
};

const normalizePrompt = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

const uniqueValues = (values) => {
  const seen = new Set();

  return values.filter((value) => {
    const key = String(value).trim().toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const matchesAnyPattern = (prompt, patterns) =>
  patterns.some((pattern) => pattern.test(prompt));

const matchFirstRule = (prompt, rules, fallback) => {
  const matchedRule = rules.find((rule) =>
    matchesAnyPattern(prompt, rule.patterns)
  );

  return matchedRule?.value || fallback;
};

const matchRuleValues = (prompt, rules, fallbackValues = []) => {
  const matchedValues = rules
    .filter((rule) => matchesAnyPattern(prompt, rule.patterns))
    .map((rule) => rule.value);

  return uniqueValues(
    matchedValues.length > 0 ? matchedValues : [...fallbackValues]
  );
};

const mergeWithFallbackValues = (matchedValues, fallbackValues, minimumCount) => {
  if (matchedValues.length >= minimumCount) {
    return matchedValues;
  }

  return uniqueValues([...matchedValues, ...fallbackValues]).slice(0, minimumCount);
};

const resolveLighting = (prompt, buildingType) => {
  const matchedLighting = matchFirstRule(
    prompt,
    LIGHTING_RULES,
    DEFAULT_ATTRIBUTES.lighting
  );

  if (matchedLighting !== DEFAULT_ATTRIBUTES.lighting) {
    return matchedLighting;
  }

  if (buildingType === 'architectural interior space') {
    return 'soft natural window light';
  }

  return matchedLighting;
};

const resolvePhotography = (prompt, buildingType) => {
  if (matchesAnyPattern(prompt, PHOTOGRAPHY_HINTS.aerial)) {
    return 'aerial drone photography, cinematic composition, corrected vertical lines';
  }

  if (matchesAnyPattern(prompt, PHOTOGRAPHY_HINTS.closeUp)) {
    return 'detail-focused architectural close-up, editorial framing, shallow depth cues';
  }

  if (buildingType === 'architectural interior space') {
    return 'interior editorial photography, wide-angle lens, balanced composition';
  }

  if (matchesAnyPattern(prompt, PHOTOGRAPHY_HINTS.eyeLevel)) {
    return 'eye-level architectural photography, balanced composition, corrected vertical lines';
  }

  return DEFAULT_ATTRIBUTES.photography;
};

const resolveRealism = (prompt) => {
  if (/\bconcept\b/i.test(prompt) || /概念/.test(prompt)) {
    return 'high-fidelity architectural visualization, realistic materials, natural shadows, global illumination';
  }

  return DEFAULT_ATTRIBUTES.realism;
};

const buildRefinedPrompt = ({
  rawPrompt,
  attributes: { buildingType, styles, materials, lighting, photography, realism }
}) => {
  const promptSegments = uniqueValues([
    rawPrompt,
    `architectural visualization of ${buildingType}`,
    `${styles.join(', ')} style`,
    materials.join(', '),
    lighting,
    photography,
    realism
  ]);

  return promptSegments.join(', ');
};

const cleanModelText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/^```(?:json|text)?/i, '')
    .replace(/```$/i, '')
    .trim()
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .trim();
};

const requestPromptRefineVia302Ai = async (rawPrompt) => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, env.ai.promptRequestTimeoutMs);

  timeoutHandle.unref?.();

  try {
    const response = await fetch(`${env.ai.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: env.ai.apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: env.ai.promptModel,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You refine architectural image-edit prompts. Return only one concise English prompt for an image editing model. Preserve the original design intent and massing. Improve style, materials, lighting, camera feeling, and realism. Do not return JSON, markdown, or explanations.'
          },
          {
            role: 'user',
            content: rawPrompt
          }
        ]
      }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => null);
    const modelText = cleanModelText(
      payload?.choices?.[0]?.message?.content || ''
    );

    if (!response.ok) {
      throw new Error(
        payload?.error?.message ||
          payload?.message ||
          `Prompt refine request failed with status ${response.status}`
      );
    }

    if (!modelText) {
      throw new Error('Prompt refine model returned empty content');
    }

    return {
      refinedPrompt: modelText,
      responseStatus: response.status
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        `Prompt refine request timed out after ${env.ai.promptRequestTimeoutMs}ms`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const refinePromptByRules = (rawPrompt) => {
  const normalizedPrompt = normalizePrompt(rawPrompt);

  logger.info(
    {
      strategy: PROMPT_REFINE_STRATEGY,
      promptLength: normalizedPrompt.length
    },
    'Prompt refinement started'
  );

  if (!normalizedPrompt) {
    const error = new Error('rawPrompt is required');

    logger.warn(
      {
        strategy: PROMPT_REFINE_STRATEGY,
        promptLength: 0,
        errorMessage: error.message
      },
      'Prompt refinement failed'
    );

    throw error;
  }

  const buildingType = matchFirstRule(
    normalizedPrompt,
    BUILDING_TYPE_RULES,
    DEFAULT_ATTRIBUTES.buildingType
  );
  const styles = matchRuleValues(normalizedPrompt, STYLE_RULES, [
    ...DEFAULT_ATTRIBUTES.styles
  ]);
  const materials = mergeWithFallbackValues(
    matchRuleValues(normalizedPrompt, MATERIAL_RULES, [
      ...DEFAULT_ATTRIBUTES.materials
    ]),
    DEFAULT_ATTRIBUTES.materials,
    3
  );
  const lighting = resolveLighting(normalizedPrompt, buildingType);
  const photography = resolvePhotography(normalizedPrompt, buildingType);
  const realism = resolveRealism(normalizedPrompt);

  const attributes = {
    buildingType,
    styles,
    materials,
    lighting,
    photography,
    realism
  };

  const result = {
    rawPrompt: normalizedPrompt,
    refinedPrompt: buildRefinedPrompt({
      rawPrompt: normalizedPrompt,
      attributes
    }),
    strategy: PROMPT_REFINE_STRATEGY,
    attributes
  };

  logger.info(
    {
      strategy: PROMPT_REFINE_STRATEGY,
      promptLength: normalizedPrompt.length,
      refinedPromptLength: result.refinedPrompt.length,
      buildingType,
      stylesCount: styles.length,
      materialsCount: materials.length
    },
    'Prompt refinement completed'
  );

  return result;
};

const refinePrompt = async (rawPrompt) => {
  const ruleBasedResult = refinePromptByRules(rawPrompt);

  if (env.ai.provider !== '302AI') {
    return ruleBasedResult;
  }

  try {
    const llmResult = await requestPromptRefineVia302Ai(ruleBasedResult.rawPrompt);

    logger.info(
      {
        strategy: '302ai-llm-prompt-refine-v1',
        model: env.ai.promptModel,
        responseStatus: llmResult.responseStatus,
        refinedPromptLength: llmResult.refinedPrompt.length
      },
      'Prompt refinement completed with LLM'
    );

    return {
      ...ruleBasedResult,
      refinedPrompt: llmResult.refinedPrompt,
      strategy: `302ai:${env.ai.promptModel}`
    };
  } catch (error) {
    logger.warn(
      {
        strategy: '302ai-llm-prompt-refine-v1',
        model: env.ai.promptModel,
        errorMessage: error.message
      },
      'Prompt refinement LLM call failed, falling back to rule-based refinement'
    );

    return ruleBasedResult;
  }
};

module.exports = {
  PROMPT_REFINE_STRATEGY,
  refinePromptByRules,
  refinePrompt
};
