using System;
using API.Modals;
using API.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {

    }

    public DbSet<Message> Messages { get; set; }
    public DbSet<Group> Groups { get; set; }
    public DbSet<GroupMember> GroupMembers { get; set; }


    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // GroupMember için Composite Key (Aynı kullanıcı aynı gruba 2 kere giremez)
        builder.Entity<GroupMember>()
            .HasKey(gm => new { gm.GroupId, gm.UserId });

        // İlişkileri tanımla (Opsiyonel ama garanti olsun)
        builder.Entity<GroupMember>()
            .HasOne(gm => gm.Group)
            .WithMany(g => g.GroupMembers)
            .HasForeignKey(gm => gm.GroupId);

        builder.Entity<GroupMember>()
            .HasOne(gm => gm.User)
            .WithMany() // User tarafında liste tutmuyorsan boş bırak
            .HasForeignKey(gm => gm.UserId);
    }
}
