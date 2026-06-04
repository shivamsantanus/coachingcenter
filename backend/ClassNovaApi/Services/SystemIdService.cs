namespace ClassNovaApi.Services
{
    public static class SystemIdService
    {
        // Entity prefix constants
        public const string Teacher     = "CNT";
        public const string Student     = "CNS";
        public const string Admin       = "CNA";
        public const string Branch      = "BRN";
        public const string Batch       = "BAT";
        public const string Class       = "CLS";
        public const string AcademicYear = "ACY";
        public const string FeePlan     = "FPL";
        public const string Payment     = "RCT";
        public const string Exam        = "EXM";

        /// <summary>
        /// Generates a 28-char system ID: {TenantCode}-{PREFIX}-{UnixMs}-{UUID4}
        /// Example: BF000-CNS-1748600123456-A3F2
        /// </summary>
        public static string Generate(string tenantCode, string prefix, Guid entityId)
        {
            var ms     = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var suffix = entityId.ToString("N")[..4].ToUpper();
            return $"{tenantCode}-{prefix}-{ms}-{suffix}";
        }

        /// <summary>
        /// Derives a 5-char uppercase tenant code from the tenant slug.
        /// Takes the first letter of each hyphen-separated word, padded to 5 chars with '0'.
        /// Example: "bright-future" → "BF000", "xyz-coaching-centre" → "XCC00"
        /// </summary>
        public static string DeriveTenantCode(string slug)
        {
            var initials = slug.Split('-')
                               .Where(word => word.Length > 0)
                               .Select(word => char.ToUpper(word[0]))
                               .Take(5)
                               .ToArray();
            return new string(initials).PadRight(5, '0');
        }
    }
}
