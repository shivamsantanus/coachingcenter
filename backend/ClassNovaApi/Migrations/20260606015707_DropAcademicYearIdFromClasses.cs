using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClassNovaApi.Migrations
{
    /// <inheritdoc />
    public partial class DropAcademicYearIdFromClasses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_classes_academic_years_academic_year_id",
                table: "classes");

            migrationBuilder.DropIndex(
                name: "ix_classes_academic_year_id",
                table: "classes");

            migrationBuilder.DropColumn(
                name: "academic_year_id",
                table: "classes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "academic_year_id",
                table: "classes",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_classes_academic_year_id",
                table: "classes",
                column: "academic_year_id");

            migrationBuilder.AddForeignKey(
                name: "fk_classes_academic_years_academic_year_id",
                table: "classes",
                column: "academic_year_id",
                principalTable: "academic_years",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
