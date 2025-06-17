const ROLES = {
  admin: {
    name: 'admin',
    description: 'Full system access',
    permissions: ['*']  // Wildcard for all permissions
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
  },
  branch: {
    name: 'branch',
    description: 'Branch-specific access',
    permissions: [
      'view:snapshots',
      'create:snapshots',
      'edit:snapshots',
      'view:batches',
      'create:batches',
      'edit:batches',
      'view:branch-data',
      'edit:branch-data'
    ]
  }
};

module.exports = { ROLES };
