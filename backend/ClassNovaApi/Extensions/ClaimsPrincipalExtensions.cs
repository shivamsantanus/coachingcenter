using System.Security.Claims;

namespace ClassNovaApi.Extensions
{
    public static class ClaimsPrincipalExtensions
    {
        public static Guid GetTenantId(this ClaimsPrincipal user)
            => Guid.Parse(user.FindFirstValue("tenant_id")!);

        // JWT serialises ClaimTypes.NameIdentifier as "nameid" — preserved as-is with MapInboundClaims = false
        public static Guid GetUserId(this ClaimsPrincipal user)
            => Guid.Parse(user.FindFirstValue("nameid")!);

        public static string GetRole(this ClaimsPrincipal user)
            => user.FindFirstValue("role")!;
    }
}
