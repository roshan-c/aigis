using Microsoft.EntityFrameworkCore;
using Tartarus.Data.Entities;

namespace Tartarus.Data;

public class TartarusDbContext : DbContext
{
    public TartarusDbContext(DbContextOptions<TartarusDbContext> options) : base(options)
    {
    }

    public DbSet<ApiClient> ApiClients => Set<ApiClient>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

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
    }
}
