using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClassNovaApi.Migrations
{
    /// <inheritdoc />
    public partial class RefactorPaymentToJunctionTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Create the new table first so data can be copied before old columns are dropped
            migrationBuilder.CreateTable(
                name: "payment_line_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    payment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    fee_plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount_paid = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_payment_line_items", x => x.id);
                    table.ForeignKey(
                        name: "fk_payment_line_items_fee_plans_fee_plan_id",
                        column: x => x.fee_plan_id,
                        principalTable: "fee_plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_payment_line_items_payments_payment_id",
                        column: x => x.payment_id,
                        principalTable: "payments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            // 2. Migrate existing flat payments → line items while fee_plan_id and amount_paid still exist
            migrationBuilder.Sql(@"
                INSERT INTO payment_line_items (id, payment_id, fee_plan_id, amount_paid)
                SELECT gen_random_uuid(), id, fee_plan_id, amount_paid
                FROM payments
                WHERE fee_plan_id IS NOT NULL;
            ");

            // 3. Drop the old FK, index, and columns now that data is safe
            migrationBuilder.DropForeignKey(
                name: "fk_payments_fee_plans_fee_plan_id",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "ix_payments_fee_plan_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "fee_plan_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "session_id",
                table: "payments");

            // 4. Rename amount_paid → total_amount (for single-plan payments, amount_paid was already the total)
            migrationBuilder.RenameColumn(
                name: "amount_paid",
                table: "payments",
                newName: "total_amount");

            // 5. Indexes on the new table
            migrationBuilder.CreateIndex(
                name: "ix_payment_line_items_fee_plan_id",
                table: "payment_line_items",
                column: "fee_plan_id");

            migrationBuilder.CreateIndex(
                name: "ix_payment_line_items_payment_id",
                table: "payment_line_items",
                column: "payment_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "payment_line_items");

            migrationBuilder.RenameColumn(
                name: "total_amount",
                table: "payments",
                newName: "amount_paid");

            migrationBuilder.AddColumn<Guid>(
                name: "fee_plan_id",
                table: "payments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "session_id",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_payments_fee_plan_id",
                table: "payments",
                column: "fee_plan_id");

            migrationBuilder.AddForeignKey(
                name: "fk_payments_fee_plans_fee_plan_id",
                table: "payments",
                column: "fee_plan_id",
                principalTable: "fee_plans",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
