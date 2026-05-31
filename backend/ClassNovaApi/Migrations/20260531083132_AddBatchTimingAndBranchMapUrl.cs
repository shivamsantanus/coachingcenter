using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClassNovaApi.Migrations
{
    /// <inheritdoc />
    public partial class AddBatchTimingAndBranchMapUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "map_url",
                table: "branches",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "end_time",
                table: "batches",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "start_time",
                table: "batches",
                type: "time without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "map_url",
                table: "branches");

            migrationBuilder.DropColumn(
                name: "end_time",
                table: "batches");

            migrationBuilder.DropColumn(
                name: "start_time",
                table: "batches");
        }
    }
}
