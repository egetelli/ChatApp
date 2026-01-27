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

namespace API.Endpoints;

public static class GroupEndpoint
{
    public static RouteGroupBuilder MapGroupEndpoint(this WebApplication app)
    {
        var group = app.MapGroup("/api/group").WithTags("Group");

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


            return Results.Ok(newGroup);
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
            return Results.Ok(group);
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

        return group;
    }



}
