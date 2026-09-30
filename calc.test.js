/*
 * 单元测试：node --test
 * 覆盖三类用例：正常路径（公式回归）、边界值、非法输入（校验与提示消息）。
 */
const test = require('node:test');
const assert = require('node:assert');
const c = require('./calc.js');

function close(actual, expected) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    '期望 ' + expected + '，实际 ' + actual
  );
}

/* ---------- 公式回归：体重 1 kg 幼猫基准例 ---------- */

test('RER：1 kg 体重为 70 kcal', () => {
  close(c.calcRER(1), 70);
});

test('RER：4 kg 体重为 70 × 4^0.75 ≈ 197.99 kcal', () => {
  close(c.calcRER(4), 70 * Math.pow(4, 0.75));
});

test('DER：RER 70 × 幼猫系数 2.5 = 175 kcal', () => {
  close(c.calcDER(70, 2.5), 175);
});

test('喂食量：DER 175 ÷ ME 400 × 100 = 43.75 g（干粮）', () => {
  close(c.calcGrams(175, 400), 43.75);
});

test('喂食量：DER 175 ÷ ME 80 × 100 = 218.75 g（湿粮）', () => {
  close(c.calcGrams(175, 80), 218.75);
});

test('混合喂养：50% 供能占比 → 干粮 21.875 g ＋ 湿粮 109.375 g', () => {
  const m = c.calcMixed(175, 400, 80, 50);
  close(m.dry, 21.875);
  close(m.wet, 109.375);
});

test('混合喂养：占比 0 与 100 分别退化为全湿粮、全干粮', () => {
  close(c.calcMixed(175, 400, 80, 0).dry, 0);
  close(c.calcMixed(175, 400, 80, 0).wet, 218.75);
  close(c.calcMixed(175, 400, 80, 100).dry, 43.75);
  close(c.calcMixed(175, 400, 80, 100).wet, 0);
});

/* ---------- validateWeight ---------- */

test('体重校验：正常值通过', () => {
  assert.strictEqual(c.validateWeight('1.2').ok, true);
  assert.strictEqual(c.validateWeight('1.2').value, 1.2);
  assert.strictEqual(c.validateWeight(4).ok, true);
  assert.strictEqual(c.validateWeight('  2.5  ').value, 2.5); // 前后空白被容忍
  assert.strictEqual(c.validateWeight('1e0').ok, true); // 合法数字形式
});

test('体重校验：0、负数、空串、文字均被拒绝且给出消息', () => {
  assert.strictEqual(c.validateWeight(0).ok, false);
  assert.strictEqual(c.validateWeight('-1').ok, false);
  assert.strictEqual(c.validateWeight('').ok, false);
  assert.strictEqual(c.validateWeight('abc').ok, false);
  assert.strictEqual(c.validateWeight(null).ok, false);
  assert.strictEqual(c.validateWeight(undefined).ok, false);
  assert.strictEqual(c.validateWeight('NaN').ok, false);
  assert.strictEqual(c.validateWeight('Infinity').ok, false);
  for (const raw of [0, '-1', '', 'abc']) {
    assert.ok(c.validateWeight(raw).message.length > 0, '拒绝时必须带提示消息：' + raw);
    assert.ok(Number.isNaN(c.validateWeight(raw).value), '拒绝时 value 置为 NaN：' + raw);
  }
});

/* ---------- validateME ---------- */

test('代谢能校验：正常值通过，label 进入错误消息', () => {
  assert.strictEqual(c.validateME('400').ok, true);
  assert.strictEqual(c.validateME('80', '湿粮代谢能').ok, true);
  const bad = c.validateME('', '干粮代谢能');
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.message.indexOf('干粮代谢能') !== -1);
});

test('代谢能校验：0、负数、非数字被拒绝', () => {
  for (const raw of [0, '-5', '', 'abc', 'e', '1e', null, undefined]) {
    assert.strictEqual(c.validateME(raw).ok, false, '应拒绝：' + String(raw));
  }
});

/* ---------- validateCoefficient ---------- */

test('系数校验：正常范围 0.8~2.5 通过且无提醒', () => {
  for (const v of ['0.8', '1.0', '1.2', '1.4', '2.5']) {
    const r = c.validateCoefficient(v);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.warn, '', v + ' 不应触发提醒');
  }
});

test('系数校验：超出 0.8~2.5 时仍通过计算，但给出提醒', () => {
  const low = c.validateCoefficient('0.5');
  assert.strictEqual(low.ok, true);
  assert.strictEqual(low.value, 0.5);
  assert.ok(low.warn.length > 0);
  const high = c.validateCoefficient('3');
  assert.strictEqual(high.ok, true);
  assert.ok(high.warn.length > 0);
});

test('系数校验：0、负数、非数字被拒绝', () => {
  for (const raw of [0, '-1', '', 'x', null, undefined, 'Infinity']) {
    assert.strictEqual(c.validateCoefficient(raw).ok, false, '应拒绝：' + String(raw));
    assert.ok(c.validateCoefficient(raw).message.length > 0);
  }
});

/* ---------- validatePercent ---------- */

test('占比校验：边界 0 与 100 均合法', () => {
  assert.strictEqual(c.validatePercent(0).ok, true);
  assert.strictEqual(c.validatePercent(100).ok, true);
  assert.strictEqual(c.validatePercent('50').value, 50);
});

test('占比校验：越界与非数字被拒绝', () => {
  for (const raw of [-1, 101, '-0.5', '100.1', '', 'abc', null, undefined]) {
    const r = c.validatePercent(raw);
    assert.strictEqual(r.ok, false, '应拒绝：' + String(raw));
    assert.ok(r.message.length > 0);
  }
});

test('系数取整：只保留两位小数', () => {
  assert.strictEqual(c.roundCoefficient(1.234), 1.23);
  assert.strictEqual(c.roundCoefficient(1.236), 1.24);
  assert.strictEqual(c.roundCoefficient(2.5), 2.5);
  assert.strictEqual(c.roundCoefficient(3), 3);
  assert.strictEqual(c.roundCoefficient(0), 0);
});

test('体重取整：只保留三位小数，且不产生错误提示类副作用', () => {
  assert.strictEqual(c.roundWeight(1.2346), 1.235);
  assert.strictEqual(c.roundWeight(1.2344), 1.234);
  assert.strictEqual(c.roundWeight(0.1234), 0.123);
  assert.strictEqual(c.roundWeight(2), 2);
});

test('roundTo：通用位数归整', () => {
  assert.strictEqual(c.roundTo(1.5, 0), 2);
  assert.strictEqual(c.roundTo(1.4, 0), 1);
  assert.strictEqual(c.roundTo(1.23456, 4), 1.2346);
});

/* ---------- 稳健性：任何离谱输入都不允许抛异常 ---------- */

test('校验函数对任意输入不抛异常', () => {
  const weird = [NaN, Infinity, -Infinity, {}, [], [1], true, false, Symbol ? 'symbol-like' : 0];
  for (const raw of weird) {
    assert.doesNotThrow(() => c.validateWeight(raw));
    assert.doesNotThrow(() => c.validateME(raw));
    assert.doesNotThrow(() => c.validateCoefficient(raw));
    assert.doesNotThrow(() => c.validatePercent(raw));
  }
});
