using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;
using Tartarus.Data.Entities;

namespace Tartarus.Data;

public class TartarusDbContext : DbContext
{
    public TartarusDbContext(DbContextOptions<TartarusDbContext> options) : base(options)
    {
    }

    public DbSet<ApiClient> ApiClients => Set<ApiClient>();
    public DbSet<Message> Messages => Set<Message>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enable pgvector extension
        modelBuilder.HasPostgresExtension("vector");

        modelBuilder.Entity<ApiClient>(entity =>
        {
            entity.ToTable("api_clients");
            
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Id)
                .HasColumnName("id");
            
            entity.Property(e => e.Name)
                .HasColumnName("name")
                .HasMaxLength(100)
                .IsRequired();
            
            entity.Property(e => e.ApiKey)
                .HasColumnName("api_key")
                .HasMaxLength(255)
                .IsRequired();
            
            entity.HasIndex(e => e.ApiKey)
                .IsUnique();
            
            entity.Property(e => e.IsActive)
                .HasColumnName("is_active")
                .HasDefaultValue(true);
            
            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.ToTable("messages");
            
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Id)
                .HasColumnName("id");
            
            entity.Property(e => e.ExternalMessageId)
                .HasColumnName("external_message_id")
                .HasMaxLength(100)
                .IsRequired();
            
            entity.Property(e => e.ChannelId)
                .HasColumnName("channel_id")
                .HasMaxLength(100)
                .IsRequired();
            
            entity.Property(e => e.GuildId)
                .HasColumnName("guild_id")
                .HasMaxLength(100);
            
            entity.Property(e => e.UserId)
                .HasColumnName("user_id")
                .HasMaxLength(100)
                .IsRequired();
            
            entity.Property(e => e.AuthorName)
                .HasColumnName("author_name")
                .HasMaxLength(100)
                .IsRequired();
            
            entity.Property(e => e.Content)
                .HasColumnName("content")
                .IsRequired();
            
            entity.Property(e => e.Role)
                .HasColumnName("role")
                .HasMaxLength(20)
                .IsRequired();
            
            entity.Property(e => e.Embedding)
                .HasColumnName("embedding")
                .HasColumnType("vector(1536)");
            
            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Index for fetching recent messages in a channel
            entity.HasIndex(e => new { e.ChannelId, e.CreatedAt })
                .HasDatabaseName("ix_messages_channel_created");
            
            // Index to prevent duplicate external messages
            entity.HasIndex(e => e.ExternalMessageId)
                .IsUnique()
                .HasDatabaseName("ix_messages_external_id");
            
            // HNSW index for fast vector similarity search
            entity.HasIndex(e => e.Embedding)
                .HasDatabaseName("ix_messages_embedding")
                .HasMethod("hnsw")
                .HasOperators("vector_cosine_ops");
        });
    }
}
