const ROLES = {
  admin: {
    name: 'admin',
    description: 'Full system access',
    permissions: ['*'],  // Wildcard for all permissions
    allowedSites: ['admin', 'frontend', 'backend']
  },
  user: {
    name: 'user',
    description: 'Regular user access',
    permissions: [
      'view:snapshots',
      'create:snapshots',
      'edit:snapshots',
      'view:batches',
      'create:batches'
    ]
  },
  viewer: {
    name: 'viewer',
    description: 'Read-only access',
    permissions: [
      'view:snapshots',
      'view:batches'
    ]
  }
};

const AVAILABLE_SITES = ['admin', 'frontend', 'backend'];

module.exports = { ROLES, AVAILABLE_SITES };
