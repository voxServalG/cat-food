/*
 * 小猫喂食量计算器 —— 计算与校验逻辑（无 DOM 依赖）
 * 浏览器端：挂到 window.CatFoodCalc；Node 端：module.exports，供 node --test 使用。
 *
 * 公式：
 *   RER = 70 × 体重(kg)^0.75          （静息能量需求，Resting Energy Requirement）
 *   DER = RER × 能量系数               （每日能量需求，Daily Energy Requirement）
 *   喂食量(g) = DER ÷ ME × 100         （ME 为代谢能，kcal/100g）
 */
(function (root) {
  'use strict';

  /* 把任意原始输入解析为有限数字；空串、null、undefined、非数字一律得到 NaN。 */
  function toFiniteNumber(raw) {
    if (raw === null || raw === undefined) return NaN;
    var s = String(raw).trim();
    if (s === '') return NaN;
    return Number(s);
  }

  function result(ok, value, message, warn) {
    return { ok: ok, value: ok ? value : NaN, message: message || '', warn: warn || '' };
  }

  /* 体重：必须为大于 0 的数字（kg）。 */
  function validateWeight(raw) {
    var n = toFiniteNumber(raw);
    if (!isFinite(n)) return result(false, n, '体重必须是数字');
    if (n <= 0) return result(false, n, '体重必须大于 0');
    return result(true, n);
  }

  /* 代谢能：必须为大于 0 的数字（kcal/100g）。label 用于拼错误消息，如“干粮代谢能”。 */
  function validateME(raw, label) {
    var name = label || '代谢能';
    var n = toFiniteNumber(raw);
    if (!isFinite(n)) return result(false, n, name + '必须是数字');
    if (n <= 0) return result(false, n, name + '必须大于 0');
    return result(true, n);
  }

  /* 能量系数：必须为大于 0 的数字；超出常见范围 0.8~2.5 时不阻断，仅提醒。 */
  function validateCoefficient(raw) {
    var n = toFiniteNumber(raw);
    if (!isFinite(n)) return result(false, n, '能量系数必须是数字');
    if (n <= 0) return result(false, n, '能量系数必须大于 0');
    if (n < 0.8 || n > 2.5) {
      return result(true, n, '', '能量系数 ' + n + ' 超出常见范围 0.8~2.5，请确认数值是否合理');
    }
    return result(true, n);
  }

  /* 干粮供能占比：必须为 0~100 的数字（%）。 */
  function validatePercent(raw) {
    var n = toFiniteNumber(raw);
    if (!isFinite(n)) return result(false, n, '占比必须是数字');
    if (n < 0 || n > 100) return result(false, n, '占比必须在 0 到 100 之间');
    return result(true, n);
  }

  function calcRER(weightKg) {
    return 70 * Math.pow(weightKg, 0.75);
  }

  function calcDER(rer, coefficient) {
    return rer * coefficient;
  }

  /* DER 全部由某种粮提供时的克数。 */
  function calcGrams(der, mePer100g) {
    return der / mePer100g * 100;
  }

  /* 混合喂养：dryPercent 为干粮供能占比（%），湿粮自动取余量。 */
  function calcMixed(der, dryME, wetME, dryPercent) {
    var p = dryPercent / 100;
    return {
      dry: calcGrams(der * p, dryME),
      wet: calcGrams(der * (1 - p), wetME)
    };
  }

  /* 四舍五入到指定小数位；用于输入位数超限时的静默归整。 */
  function roundTo(n, decimals) {
    var f = Math.pow(10, decimals);
    return Math.round(n * f) / f;
  }

  /* 体重最多保留千分位（三位小数）。 */
  function roundWeight(n) {
    return roundTo(n, 3);
  }

  /* 能量系数只保留到百分位（两位小数）。 */
  function roundCoefficient(n) {
    return roundTo(n, 2);
  }

  var api = {
    toFiniteNumber: toFiniteNumber,
    validateWeight: validateWeight,
    validateME: validateME,
    validateCoefficient: validateCoefficient,
    validatePercent: validatePercent,
    roundTo: roundTo,
    roundWeight: roundWeight,
    roundCoefficient: roundCoefficient,
    calcRER: calcRER,
    calcDER: calcDER,
    calcGrams: calcGrams,
    calcMixed: calcMixed
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.CatFoodCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
