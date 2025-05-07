const Role = require('../models/Role');

const checkPermission = async (user, requiredPermission) => {
  try {
    if (!user || !user.role) return false;

    // Admin has all permissions
    if (user.role === 'admin') return true;

    const role = await Role.findOne({ name: user.role });
    if (!role) return false;

    // Check if role has wildcard permission
    if (role.permissions.includes('*')) return true;

    // Check specific permission
    return role.permissions.includes(requiredPermission);
  } catch (error) {
    console.error('[Permission] Check failed:', error);
    return false;
  }
};

module.exports = { checkPermission };
