using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClassNovaApi.Migrations
{
    /// <inheritdoc />
    public partial class AddLandingPageToTenantSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "accent_color",
                table: "tenant_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "landing_page_json",
                table: "tenant_settings",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "accent_color",
                table: "tenant_settings");

            migrationBuilder.DropColumn(
                name: "landing_page_json",
                table: "tenant_settings");
        }
    }
}
