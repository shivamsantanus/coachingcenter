export interface NavItem {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  readonly routePath: string;
  readonly sortOrder: number;
  readonly isLocked: boolean;
}

export interface NavPermissionEntry {
  readonly roleCode: string;
  readonly isEnabled: boolean;
}

export interface NavMatrixRow {
  readonly key: string;
  readonly label: string;
  readonly isLocked: boolean;
  readonly permissions: NavPermissionEntry[];
}

export interface UpdateNavPermissionRequest {
  readonly roleCode: string;
  readonly navItemKey: string;
  readonly isEnabled: boolean;
}
