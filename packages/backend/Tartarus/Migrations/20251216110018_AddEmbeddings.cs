using Microsoft.EntityFrameworkCore.Migrations;
using Pgvector;

#nullable disable

namespace Tartarus.Migrations
{
    /// <inheritdoc />
    public partial class AddEmbeddings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:vector", ",,");

            migrationBuilder.AddColumn<Vector>(
                name: "embedding",
                table: "messages",
                type: "vector(1536)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_messages_embedding",
                table: "messages",
                column: "embedding")
                .Annotation("Npgsql:IndexMethod", "hnsw")
                .Annotation("Npgsql:IndexOperators", new[] { "vector_cosine_ops" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_messages_embedding",
                table: "messages");

            migrationBuilder.DropColumn(
                name: "embedding",
                table: "messages");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:vector", ",,");
        }
    }
}
