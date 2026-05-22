export interface TenantSummary {
  id:                   string;
  name:                 string;
  slug:                 string;
  organizationType:     string;
  status:               string;
  primaryContactName:   string;
  primaryContactEmail:  string;
  planCode:             string | null;
  createdAt:            string;
}

export interface CreateTenantPayload {
  name:                 string;
  slug:                 string;
  organizationType:     string;
  primaryContactName:   string;
  primaryContactEmail:  string;
  primaryContactPhone:  string;
  brandName:            string;
  logoUrl:              string | null;
  timezone:             string;
  currencyCode:         string;
}
