const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildRenderEditPrompt
} = require('../src/modules/render-tasks/render-prompt-composer');

test('buildRenderEditPrompt wraps user intent with geometry-preserving guidance', () => {
  const result = buildRenderEditPrompt({
    userPrompt: '将其渲染为白色未来主义建筑，暖色灯光，照片级真实感'
  });

  assert.match(result, /hard geometry reference/u);
  assert.match(result, /not a redesign task/u);
  assert.match(result, /Preserve the original building massing/u);
  assert.match(
    result,
    /Original user requirements \(highest priority\): 将其渲染为白色未来主义建筑，暖色灯光，照片级真实感/u
  );
});

test('buildRenderEditPrompt falls back to rawPrompt when userPrompt is missing', () => {
  const result = buildRenderEditPrompt({
    rawPrompt: '保留主体不变，增强材质和夜景灯光'
  });

  assert.match(
    result,
    /Original user requirements \(highest priority\): 保留主体不变，增强材质和夜景灯光/u
  );
});

test('buildRenderEditPrompt separates raw constraints from appearance enhancement', () => {
  const result = buildRenderEditPrompt({
    rawPrompt: '保留原建筑主体结构与总体轮廓',
    userPrompt: '保留原建筑主体结构与总体轮廓',
    appearancePrompt: '采用玻璃金属材质、电影级光影和超写实渲染'
  });

  assert.match(
    result,
    /Original user requirements \(highest priority\): 保留原建筑主体结构与总体轮廓/u
  );
  assert.match(
    result,
    /Appearance enhancement only \(materials, lighting, atmosphere, realism; must not override geometry\): 采用玻璃金属材质、电影级光影和超写实渲染/u
  );
});

test('buildRenderEditPrompt appends geometry constraints when available', () => {
  const result = buildRenderEditPrompt({
    rawPrompt: '严格保持建筑主体原有结构形状',
    geometryConstraint: {
      summary: 'single sculptural looped shell with a large central void',
      massing: ['single continuous shell', 'wide low silhouette'],
      topology: ['large central void must remain'],
      shapeLanguage: ['continuous smooth curvature', 'non-orthogonal geometry'],
      camera: ['preserve current side perspective'],
      forbidden: ['no curtain-wall office tower', 'no orthogonal stacked floors']
    }
  });

  assert.match(result, /Image-derived geometry constraints:/u);
  assert.match(
    result,
    /Geometry summary: single sculptural looped shell with a large central void/u
  );
  assert.match(result, /Massing constraints: single continuous shell; wide low silhouette/u);
  assert.match(result, /Forbidden redesigns: no curtain-wall office tower; no orthogonal stacked floors/u);
});

test('buildRenderEditPrompt rejects empty input', () => {
  assert.throws(
    () => buildRenderEditPrompt({ userPrompt: '   ', rawPrompt: '' }),
    /userPrompt is required/
  );
});
