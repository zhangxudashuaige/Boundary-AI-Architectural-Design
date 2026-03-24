const normalizeNonEmptyString = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const normalizeStringList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeNonEmptyString(item))
    .filter(Boolean);
};

const formatConstraintList = (items) => {
  const normalizedItems = normalizeStringList(items);

  if (normalizedItems.length === 0) {
    return null;
  }

  return normalizedItems.join('; ');
};

const buildRenderEditPrompt = ({
  userPrompt,
  rawPrompt,
  appearancePrompt,
  geometryConstraint,
  hasSourceImage = true
} = {}) => {
  const resolvedRawPrompt =
    normalizeNonEmptyString(rawPrompt) || normalizeNonEmptyString(userPrompt);
  const resolvedAppearancePrompt =
    normalizeNonEmptyString(appearancePrompt) ||
    normalizeNonEmptyString(userPrompt) ||
    resolvedRawPrompt;

  if (!resolvedRawPrompt) {
    throw new Error('userPrompt is required to build a render edit prompt');
  }

  const promptSections = hasSourceImage
    ? [
        'Use the input image as the hard geometry reference for architectural rendering.',
        'This is a render enhancement task, not a redesign task.',
        'Preserve the original building massing, silhouette, proportions, openings, roofline, cantilever relationships, and camera composition.',
        'If visual information is ambiguous, keep the original geometry and viewpoint instead of inventing a new building.'
      ]
    : [
        'Generate a high-quality architectural image based only on the user requirements.',
        'There is no source image for this task, so you should create a new image rather than edit an existing one.',
        'Keep the composition, massing, facade logic, materials, and atmosphere coherent with the user requirements.'
      ];

  const geometrySections = [
    ['Geometry summary', normalizeNonEmptyString(geometryConstraint?.summary)],
    ['Massing constraints', formatConstraintList(geometryConstraint?.massing)],
    ['Topology constraints', formatConstraintList(geometryConstraint?.topology)],
    [
      'Shape language constraints',
      formatConstraintList(geometryConstraint?.shapeLanguage)
    ],
    ['Camera constraints', formatConstraintList(geometryConstraint?.camera)],
    ['Forbidden redesigns', formatConstraintList(geometryConstraint?.forbidden)]
  ].filter(([, value]) => value);

  if (geometrySections.length > 0) {
    promptSections.push('Image-derived geometry constraints:');

    geometrySections.forEach(([label, value]) => {
      promptSections.push(`- ${label}: ${value}`);
    });
  }

  promptSections.push(
    `Original user requirements (highest priority): ${resolvedRawPrompt}`
  );

  if (
    resolvedAppearancePrompt &&
    resolvedAppearancePrompt !== resolvedRawPrompt
  ) {
    promptSections.push(
      `Appearance enhancement only (materials, lighting, atmosphere, realism; must not override geometry): ${resolvedAppearancePrompt}`
    );
  }

  return promptSections.join('\n');
};

module.exports = {
  buildRenderEditPrompt
};
