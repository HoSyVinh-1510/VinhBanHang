using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// Base controller cung cấp helper methods dùng chung cho tất cả API controllers.
    /// </summary>
    [ApiController]
    public abstract class BaseApiController : ControllerBase
    {
        /// <summary>Lấy UserId của người dùng đang đăng nhập.</summary>
        protected string? GetUserId() =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        /// <summary>Kiểm tra người dùng có phải Admin không.</summary>
        protected bool IsAdmin() => User.IsInRole("Admin");

        /// <summary>Trả về "Admin" hoặc "User" dựa theo role.</summary>
        protected string GetActorType() => IsAdmin() ? "Admin" : "User";

        /// <summary>
        /// Chuẩn hóa giá trị nullable: trả về null nếu rỗng/khoảng trắng, ngược lại Trim().
        /// </summary>
        protected static string? NormalizeNullable(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        /// <summary>Tạo response phân trang chuẩn.</summary>
        protected static object PagedResult(object items, int totalCount, int page, int pageSize) => new
        {
            items,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
        };
    }
}
