using System;
using System.Text.RegularExpressions;
using API.Common;
using API.Data;
using API.DTOs;
using API.Modals;
using API.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration.UserSecrets;
using API.Models;
using Microsoft.AspNetCore.Identity;
using System.Dynamic;
using Microsoft.AspNetCore.Mvc;

namespace API.Endpoints;

public static class GroupEndpoint
{
    public static RouteGroupBuilder MapGroupEndpoint(this WebApplication app)
    {
        var group = app.MapGroup("/api/group").WithTags("Group").RequireAuthorization();

        group.MapGet("/{groupId}/members", async (HttpContext context, AppDbContext db, int groupId) =>
        {
            var currentUserId = context.User.GetUserId();
            if (currentUserId == Guid.Empty) return Results.Unauthorized();

            // 1. Önce grubun varlığını ve kullanıcının üye olup olmadığını kontrol et
            // (Performans için sadece gerekli alanları çekiyoruz)
            var isMember = await db.GroupMembers
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == currentUserId.ToString());

            if (!isMember)
            {
                return Results.Json(new { message = "Bu grubun üyelerini görme yetkiniz yok." }, statusCode: 403);
            }

            // 2. Üyeleri ve kullanıcı detaylarını çek (Join işlemi)
            var members = await db.GroupMembers
                .Where(gm => gm.GroupId == groupId)
                .Join(db.Users,             // AppUsers tablosuyla birleştir
                      gm => gm.UserId,      // GroupMember.UserId
                      u => u.Id,            // AppUser.Id
                      (gm, u) => new        // Sonuç objesini oluştur
                      {
                          userId = u.Id,
                          userName = u.UserName,
                          fullName = u.FullName,
                          profileImage = u.ProfileImage,
                          isAdmin = gm.IsAdmin,
                          joinedDate = gm.JoinedDate
                      })
                .OrderByDescending(m => m.isAdmin) // Yöneticiler en üstte
                .ThenBy(m => m.fullName)           // Sonra isme göre
                .ToListAsync();

            return Results.Ok(members);
        });
        group.MapPost("/create", async (HttpContext context, AppDbContext db, CreateGroupDto dto) =>
        {
            var creatorId = context.User.GetUserId();
            if (creatorId == Guid.Empty)
                return Results.Unauthorized();
            if (dto.GroupImage is null)
            {
                return Results.BadRequest(Response<string>.Failure("Profile image is required."));
            }

            string finalGroupKey;

            if (string.IsNullOrWhiteSpace(dto.GroupKey))
            {
                finalGroupKey = Guid.NewGuid().ToString().Substring(0, 8).ToUpper();
            }
            else
            {
                var isKeyTaken = await db.Groups.AnyAsync(g => g.GroupKey == dto.GroupKey);
                if (isKeyTaken)
                {
                    return Results.BadRequest(new { message = "Bu grup anahtarı zaten kullanımda, lütfen başka bir tane deneyin." });
                }
                finalGroupKey = dto.GroupKey.Trim().ToLower().Replace(" ", "-");
            }

            var newGroup = new Group
            {
                GroupName = dto.GroupName,
                Description = dto.Description,
                GroupImage = dto.GroupImage,
                GroupKey = finalGroupKey,
                CreatorId = creatorId.ToString(),
                IsPrivate = dto.IsPrivate,
                CreatedDate = DateTime.UtcNow
            };

            newGroup.GroupMembers.Add(new GroupMember
            {
                UserId = creatorId.ToString(),
                IsAdmin = true,
                JoinedDate = DateTime.UtcNow
            });

            db.Groups.Add(newGroup);
            await db.SaveChangesAsync();


            return Results.Ok(new
            {
                id = newGroup.Id,
                groupName = newGroup.GroupName,
                groupImage = newGroup.GroupImage,
                description = newGroup.Description,
                groupKey = newGroup.GroupKey,
                isPrivate = newGroup.IsPrivate,
                createdAt = newGroup.CreatedDate
            });
        }).RequireAuthorization();


        group.MapGet("/my-groups", async (HttpContext context, AppDbContext db) =>
        {
            var userId = context.User.GetUserId();
            if (userId == Guid.Empty) return Results.Unauthorized();

            var groups = await db.GroupMembers
                 .Where(gm => gm.UserId == userId.ToString())
                 .Include(gm => gm.Group)
                 .Select(gm => new
                 {
                     gm.GroupId,
                     gm.Group.GroupName,
                     gm.Group.GroupImage,
                     gm.Group.Description,
                     gm.IsAdmin,
                     MemberCount = gm.Group.GroupMembers.Count()
                 }).ToListAsync();

            return Results.Ok(groups);
        });

        group.MapPut("/update/{groupId}", async (HttpContext context, AppDbContext db, int groupId, CreateGroupDto dto) =>
        {
            var userId = context.User.GetUserId();
            if (userId == Guid.Empty) return Results.Unauthorized();

            var group = await db.Groups
                .Include(g => g.GroupMembers)
                .FirstOrDefaultAsync(g => g.Id == groupId);

            if (group is null) return Results.NotFound(new { message = "Grup bulunamadı." });

            var isUserAdmin = group.GroupMembers.Any(gm => gm.UserId == userId.ToString() && gm.IsAdmin);
            if (!isUserAdmin) return Results.Forbid();

            group.GroupName = dto.GroupName;
            group.Description = dto.Description;
            group.GroupImage = dto.GroupImage;
            group.IsPrivate = dto.IsPrivate;

            if (!string.IsNullOrWhiteSpace(dto.GroupKey) && dto.GroupKey != group.GroupKey)
            {
                var isKeyTaken = await db.Groups.AnyAsync(g => g.GroupKey == dto.GroupKey && g.Id != groupId);
                if (isKeyTaken) return Results.BadRequest(new { message = "Bu grup anahtarı zaten kullanımda." });
                group.GroupKey = dto.GroupKey.Trim().ToLower().Replace(" ", "-");
            }

            await db.SaveChangesAsync();
            return Results.Ok(new
            {
                id = group.Id,
                groupName = group.GroupName,
                description = group.Description,
                groupImage = group.GroupImage
            });
        });


        group.MapPost("/{groupId}/add-member/{targetUserName}", async (HttpContext context, AppDbContext db, UserManager<AppUser> userManager,
        int groupId, string targetUserName) =>
        {
            var currentUserId = context.User.GetUserId();
            if (currentUserId == Guid.Empty) return Results.Unauthorized();

            var group = await db.Groups
                .Include(g => g.GroupMembers)
                .FirstOrDefaultAsync(g => g.Id == groupId);
            if (group is null) return Results.NotFound(new { message = "Grup bulunamadı." });

            var isUserAdmin = group.GroupMembers.Any(gm => gm.UserId == currentUserId.ToString() && gm.IsAdmin);
            if (!isUserAdmin) return Results.Json(new { message = "Üye eklemek için yönetici olmalısınız" }, statusCode: 403);

            var userToAdd = await userManager.FindByNameAsync(targetUserName);
            if (userToAdd is null) return Results.NotFound(new { message = "Kullanıcı bulunamadı." });

            if (group.GroupMembers.Any(gm => gm.UserId == userToAdd.Id))
            {
                return Results.BadRequest(new { message = "Kullanıcı zaten bu grupta" });
            }

            db.GroupMembers.Add(new GroupMember
            {
                GroupId = groupId,
                UserId = userToAdd.Id,
                IsAdmin = false,
                JoinedDate = DateTime.UtcNow
            });

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Kullanıcı gruba eklendi" });
        });

        group.MapPost("/{groupId}/add-members", async (HttpContext context, AppDbContext db, UserManager<AppUser> userManager,
             int groupId, [FromBody] AddMembersDto dto) =>
        {
            var currentUserId = context.User.GetUserId();
            if (currentUserId == Guid.Empty) return Results.Unauthorized();

            var group = await db.Groups
                .Include(g => g.GroupMembers)
                .FirstOrDefaultAsync(g => g.Id == groupId);
            if (group is null) return Results.NotFound(new { message = "Grup bulunamadı." });

            var isUserAdmin = group.GroupMembers.Any(gm => gm.UserId == currentUserId.ToString() && gm.IsAdmin);
            if (!isUserAdmin) return Results.Json(new { message = "Üye eklemek için yönetici olmalısınız" }, statusCode: 403);

            var addedCount = 0;
            var errors = new List<string>();

            foreach (var userName in dto.UserNames)
            {
                var userToAdd = await userManager.FindByNameAsync(userName);
                if (userToAdd is null)
                {
                    errors.Add($"{userName} bulunamadı.");
                    continue;
                }

                if (group.GroupMembers.Any(gm => gm.UserId == userToAdd.Id))
                {
                    // Zaten üyeyse pas geç
                    continue;
                }

                db.GroupMembers.Add(new GroupMember
                {
                    GroupId = groupId,
                    UserId = userToAdd.Id,
                    IsAdmin = false,
                    JoinedDate = DateTime.UtcNow
                });
                addedCount++;
            }

            if (addedCount > 0)
            {
                await db.SaveChangesAsync();
                return Results.Ok(new { message = $"{addedCount} kişi gruba eklendi.", errors });
            }

            return Results.BadRequest(new { message = "Kimse eklenemedi.", errors });
        });

        group.MapDelete("/{groupId}/remove-member/{targetUserId}", async (HttpContext context, AppDbContext db, int groupId, string targetUserId) =>
        {
            var currentUserId = context.User.GetUserId();
            if (currentUserId == Guid.Empty) return Results.Unauthorized();

            var group = await db.Groups
                .Include(g => g.GroupMembers)
                .FirstOrDefaultAsync(g => g.Id == groupId);
            if (group is null) return Results.NotFound(new { message = "Grup bulunamadı." });

            var isUserAdmin = group.GroupMembers.Any(gm => gm.UserId == currentUserId.ToString() && gm.IsAdmin);

            bool isSelfRemoval = currentUserId.ToString() == targetUserId;
            if (!isUserAdmin && !isSelfRemoval)
            {
                return Results.Json(new { message = "Üye çıkarmak için yönetici yetkisi gerekiyor." }, statusCode: 403);
            }

            var memberToRemove = group.GroupMembers.FirstOrDefault(gm => gm.UserId == targetUserId);
            if (memberToRemove is null)
            {
                return Results.NotFound(new { message = "Bu kullanıcı zaten grubun üyesi değil." });
            }

            if (isSelfRemoval && memberToRemove.IsAdmin)
            {
                var adminCount = group.GroupMembers.Count(gm => gm.IsAdmin);
                if (adminCount <= 1)
                {
                    return Results.BadRequest(new { message = "Gruptaki son yönetici sizsiniz. Kendinizi çıkarmadan önce başka birini yönetici yapmalısınız." });
                }
            }

            db.GroupMembers.Remove(memberToRemove);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = isSelfRemoval ? "Gruptan ayrıldınız." : "Üye başarıyla çıkarıldı." });
        });

        group.MapPut("/{groupId}/make-admin/{targetUserId}", async (HttpContext context, AppDbContext db, int groupId, string targetUserId) =>
        {
            var currentUserId = context.User.GetUserId();
            if (currentUserId == Guid.Empty) return Results.Unauthorized();

            var group = await db.Groups
                .Include(g => g.GroupMembers)
                .FirstOrDefaultAsync(g => g.Id == groupId);
            if (group is null) return Results.NotFound(new { message = "Grup bulunamadı." });

            var isUserAdmin = group.GroupMembers.Any(gm => gm.UserId == currentUserId.ToString() && gm.IsAdmin);
            if (!isUserAdmin) return Results.Json(new { message = "Yönetici yetkisi gerekiyor." }, statusCode: 403);

            var memberToPromote = group.GroupMembers.FirstOrDefault(gm => gm.UserId == targetUserId);
            if (memberToPromote is null) return Results.NotFound(new { message = "Bu kullanıcı zaten grubun üyesi değil." });

            memberToPromote.IsAdmin = true;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Üye yönetici yapıldı." });
        });

        // --- [YENİ] YÖNETİCİLİĞİ GERİ AL (REVOKE ADMIN) ---
        group.MapPut("/{groupId}/revoke-admin/{targetUserId}", async (HttpContext context, AppDbContext db, int groupId, string targetUserId) =>
        {
            var currentUserId = context.User.GetUserId();
            if (currentUserId == Guid.Empty) return Results.Unauthorized();

            var group = await db.Groups
                .Include(g => g.GroupMembers)
                .FirstOrDefaultAsync(g => g.Id == groupId);
            if (group is null) return Results.NotFound(new { message = "Grup bulunamadı." });

            // İşlemi yapan kişi yönetici mi?
            var isUserAdmin = group.GroupMembers.Any(gm => gm.UserId == currentUserId.ToString() && gm.IsAdmin);
            if (!isUserAdmin) return Results.Json(new { message = "Yönetici yetkisi gerekiyor." }, statusCode: 403);

            // Hedef kişi grupta mı?
            var memberToDemote = group.GroupMembers.FirstOrDefault(gm => gm.UserId == targetUserId);
            if (memberToDemote is null) return Results.NotFound(new { message = "Kullanıcı bulunamadı." });

            // Hedef zaten yönetici değilse?
            if (!memberToDemote.IsAdmin) return Results.BadRequest(new { message = "Kullanıcı zaten yönetici değil." });

            // SON YÖNETİCİ KONTROLÜ: Grupta tek yönetici kaldıysa onun yetkisini alamasın
            var adminCount = group.GroupMembers.Count(gm => gm.IsAdmin);
            if (adminCount <= 1)
            {
                return Results.BadRequest(new { message = "Gruptaki son yönetici bu kişi. Yetkisini almadan önce başka birini yönetici yapmalısınız." });
            }

            memberToDemote.IsAdmin = false;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Yöneticilik yetkisi alındı." });
        });

        return group;
    }



}
