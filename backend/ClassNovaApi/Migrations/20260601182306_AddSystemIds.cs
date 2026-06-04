using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClassNovaApi.Migrations
{
    /// <inheritdoc />
    public partial class AddSystemIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "system_id",
                table: "users",
                type: "char(28)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "code",
                table: "tenants",
                type: "char(5)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "system_id",
                table: "teachers",
                type: "char(28)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "system_id",
                table: "students",
                type: "char(28)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "system_id",
                table: "payments",
                type: "char(28)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "system_id",
                table: "fee_plans",
                type: "char(28)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "system_id",
                table: "exams",
                type: "char(28)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "system_id",
                table: "classes",
                type: "char(28)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "system_id",
                table: "branches",
                type: "char(28)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "system_id",
                table: "batches",
                type: "char(28)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "system_id",
                table: "academic_years",
                type: "char(28)",
                nullable: true);

            // ── Populate tenant codes from slug ───────────────────────────────────
            // Rule: first letter of each hyphen-separated word, UPPERCASE, padded to 5 chars with '0'
            // e.g. "bright-future" → "BF000"
            // Aggregate must live in a subquery — PostgreSQL forbids aggregate in UPDATE SET directly.
            migrationBuilder.Sql(@"
                UPDATE tenants t
                SET code = computed.code
                FROM (
                    SELECT
                        id,
                        RPAD(UPPER(STRING_AGG(LEFT(word, 1), '' ORDER BY ord)), 5, '0') AS code
                    FROM (
                        SELECT id, word, ordinality AS ord
                        FROM   tenants,
                               LATERAL UNNEST(STRING_TO_ARRAY(slug, '-')) WITH ORDINALITY AS u(word, ordinality)
                    ) words
                    GROUP BY id
                ) computed
                WHERE t.id = computed.id
            ");

            // ── Populate system_id for each entity ────────────────────────────────
            // Format: {TenantCode}-{PREFIX}-{UnixMs}-{UUID4}
            // UnixMs derived from created_at (seconds × 1000 = milliseconds)
            // UUID4 = first 4 uppercase hex chars of the row's own id
            migrationBuilder.Sql(@"
                UPDATE teachers t
                SET system_id = CONCAT(
                    (SELECT code FROM tenants WHERE id = t.tenant_id),
                    '-CNT-',
                    EXTRACT(EPOCH FROM t.created_at)::BIGINT * 1000,
                    '-',
                    UPPER(SUBSTRING(REPLACE(t.id::text, '-', ''), 1, 4))
                )
            ");

            migrationBuilder.Sql(@"
                UPDATE students s
                SET system_id = CONCAT(
                    (SELECT code FROM tenants WHERE id = s.tenant_id),
                    '-CNS-',
                    EXTRACT(EPOCH FROM s.created_at)::BIGINT * 1000,
                    '-',
                    UPPER(SUBSTRING(REPLACE(s.id::text, '-', ''), 1, 4))
                )
            ");

            migrationBuilder.Sql(@"
                UPDATE branches b
                SET system_id = CONCAT(
                    (SELECT code FROM tenants WHERE id = b.tenant_id),
                    '-BRN-',
                    EXTRACT(EPOCH FROM b.created_at)::BIGINT * 1000,
                    '-',
                    UPPER(SUBSTRING(REPLACE(b.id::text, '-', ''), 1, 4))
                )
            ");

            migrationBuilder.Sql(@"
                UPDATE batches bt
                SET system_id = CONCAT(
                    (SELECT code FROM tenants WHERE id = bt.tenant_id),
                    '-BAT-',
                    EXTRACT(EPOCH FROM bt.created_at)::BIGINT * 1000,
                    '-',
                    UPPER(SUBSTRING(REPLACE(bt.id::text, '-', ''), 1, 4))
                )
            ");

            migrationBuilder.Sql(@"
                UPDATE classes c
                SET system_id = CONCAT(
                    (SELECT code FROM tenants WHERE id = c.tenant_id),
                    '-CLS-',
                    EXTRACT(EPOCH FROM c.created_at)::BIGINT * 1000,
                    '-',
                    UPPER(SUBSTRING(REPLACE(c.id::text, '-', ''), 1, 4))
                )
            ");

            migrationBuilder.Sql(@"
                UPDATE academic_years ay
                SET system_id = CONCAT(
                    (SELECT code FROM tenants WHERE id = ay.tenant_id),
                    '-ACY-',
                    EXTRACT(EPOCH FROM ay.created_at)::BIGINT * 1000,
                    '-',
                    UPPER(SUBSTRING(REPLACE(ay.id::text, '-', ''), 1, 4))
                )
            ");

            migrationBuilder.Sql(@"
                UPDATE fee_plans fp
                SET system_id = CONCAT(
                    (SELECT code FROM tenants WHERE id = fp.tenant_id),
                    '-FPL-',
                    EXTRACT(EPOCH FROM fp.created_at)::BIGINT * 1000,
                    '-',
                    UPPER(SUBSTRING(REPLACE(fp.id::text, '-', ''), 1, 4))
                )
            ");

            migrationBuilder.Sql(@"
                UPDATE payments p
                SET system_id = CONCAT(
                    (SELECT code FROM tenants WHERE id = p.tenant_id),
                    '-RCT-',
                    EXTRACT(EPOCH FROM p.created_at)::BIGINT * 1000,
                    '-',
                    UPPER(SUBSTRING(REPLACE(p.id::text, '-', ''), 1, 4))
                )
            ");

            migrationBuilder.Sql(@"
                UPDATE exams e
                SET system_id = CONCAT(
                    (SELECT code FROM tenants WHERE id = e.tenant_id),
                    '-EXM-',
                    EXTRACT(EPOCH FROM e.created_at)::BIGINT * 1000,
                    '-',
                    UPPER(SUBSTRING(REPLACE(e.id::text, '-', ''), 1, 4))
                )
            ");

            migrationBuilder.CreateIndex(
                name: "ix_users_system_id",
                table: "users",
                column: "system_id",
                unique: true,
                filter: "system_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_teachers_system_id",
                table: "teachers",
                column: "system_id",
                unique: true,
                filter: "system_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_students_system_id",
                table: "students",
                column: "system_id",
                unique: true,
                filter: "system_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_payments_system_id",
                table: "payments",
                column: "system_id",
                unique: true,
                filter: "system_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_fee_plans_system_id",
                table: "fee_plans",
                column: "system_id",
                unique: true,
                filter: "system_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_exams_system_id",
                table: "exams",
                column: "system_id",
                unique: true,
                filter: "system_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_classes_system_id",
                table: "classes",
                column: "system_id",
                unique: true,
                filter: "system_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_branches_system_id",
                table: "branches",
                column: "system_id",
                unique: true,
                filter: "system_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_batches_system_id",
                table: "batches",
                column: "system_id",
                unique: true,
                filter: "system_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_academic_years_system_id",
                table: "academic_years",
                column: "system_id",
                unique: true,
                filter: "system_id IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_users_system_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ix_teachers_system_id",
                table: "teachers");

            migrationBuilder.DropIndex(
                name: "ix_students_system_id",
                table: "students");

            migrationBuilder.DropIndex(
                name: "ix_payments_system_id",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "ix_fee_plans_system_id",
                table: "fee_plans");

            migrationBuilder.DropIndex(
                name: "ix_exams_system_id",
                table: "exams");

            migrationBuilder.DropIndex(
                name: "ix_classes_system_id",
                table: "classes");

            migrationBuilder.DropIndex(
                name: "ix_branches_system_id",
                table: "branches");

            migrationBuilder.DropIndex(
                name: "ix_batches_system_id",
                table: "batches");

            migrationBuilder.DropIndex(
                name: "ix_academic_years_system_id",
                table: "academic_years");

            migrationBuilder.DropColumn(
                name: "system_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "code",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "system_id",
                table: "teachers");

            migrationBuilder.DropColumn(
                name: "system_id",
                table: "students");

            migrationBuilder.DropColumn(
                name: "system_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "system_id",
                table: "fee_plans");

            migrationBuilder.DropColumn(
                name: "system_id",
                table: "exams");

            migrationBuilder.DropColumn(
                name: "system_id",
                table: "classes");

            migrationBuilder.DropColumn(
                name: "system_id",
                table: "branches");

            migrationBuilder.DropColumn(
                name: "system_id",
                table: "batches");

            migrationBuilder.DropColumn(
                name: "system_id",
                table: "academic_years");
        }
    }
}
