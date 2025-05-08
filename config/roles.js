const ROLES = {
  admin: {
    name: 'admin',
    description: 'Full system access',
    permissions: [
      '*',  // Wildcard for all permissions
      'view:snapshots',
      'create:snapshots',
      'edit:snapshots',
      'delete:snapshots',
      'view:batches',
      'create:batches',
      'edit:batches',
      'delete:batches',
      'view:users',
      'create:users',
      'edit:users',
      'delete:users',
      'view:roles',
      'create:roles',
      'edit:roles',
      'delete:roles',
      'admin:access'
    ],
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
