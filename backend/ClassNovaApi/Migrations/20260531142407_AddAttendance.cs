using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClassNovaApi.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "attendances",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    student_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    marked_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_attendances", x => x.id);
                    table.ForeignKey(
                        name: "fk_attendances_batches_batch_id",
                        column: x => x.batch_id,
                        principalTable: "batches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_attendances_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_attendances_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_attendances_users_marked_by_id",
                        column: x => x.marked_by_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_attendances_batch_id",
                table: "attendances",
                column: "batch_id");

            migrationBuilder.CreateIndex(
                name: "ix_attendances_marked_by_id",
                table: "attendances",
                column: "marked_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_attendances_student_id",
                table: "attendances",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "ix_attendances_tenant_id_batch_id_date",
                table: "attendances",
                columns: new[] { "tenant_id", "batch_id", "date" });

            migrationBuilder.CreateIndex(
                name: "ix_attendances_tenant_id_batch_id_student_id_date",
                table: "attendances",
                columns: new[] { "tenant_id", "batch_id", "student_id", "date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_attendances_tenant_id_student_id_date",
                table: "attendances",
                columns: new[] { "tenant_id", "student_id", "date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attendances");
        }
    }
}
