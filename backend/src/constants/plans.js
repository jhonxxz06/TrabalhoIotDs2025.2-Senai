const PLAN_LIMITS = {
  gratuito: {
    maxUsers: 2,
    maxDevices: 3,
    hasOverageTables: false,
    hasNotifications: false
  },
  comercial: {
    maxUsers: 5,
    maxDevices: 10,
    hasOverageTables: true,
    hasNotifications: false
  },
  empresarial: {
    maxUsers: 25,
    maxDevices: 50,
    hasOverageTables: true,
    hasNotifications: true
  }
};

const VALID_PLANS = Object.keys(PLAN_LIMITS);

module.exports = { PLAN_LIMITS, VALID_PLANS };
