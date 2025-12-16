using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Tartarus.Migrations
{
    /// <inheritdoc />
    public partial class AddMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "messages",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    external_message_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    guild_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    user_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    author_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_messages", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_messages_channel_created",
                table: "messages",
                columns: new[] { "channel_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_messages_external_id",
                table: "messages",
                column: "external_message_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "messages");
        }
    }
}
