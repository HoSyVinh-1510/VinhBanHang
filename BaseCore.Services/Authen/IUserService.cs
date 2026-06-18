using BaseCore.DTO;
using BaseCore.DTO.Common;
using BaseCore.Entities;
using BaseCore.Services.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services.Authen
{
    public interface IUserService
    {
        // Keep the old methods for internal use or backward compatibility (for AuthController)
        Task<User> Authenticate(string username, string password);
        Task<List<User>> GetAll();
        Task<User> GetById(string id);
        Task<User> Create(User user, string password);
        Task Update(User user, string password = null);
        Task Delete(string id);

        // New service result-based methods for UserController
        Task<ServiceResult<UserResponse>> GetByIdAsync(string id, bool includeRefundQrItems = false);
        Task<ServiceResult<PagedResult<UserResponse>>> SearchAsync(string keyword, bool? isActive, int? userType, int page, int pageSize);
        Task<ServiceResult<UserResponse>> CreateAsync(CreateUserRequest request);
        Task<ServiceResult<UserResponse>> UpdateAsync(string id, UpdateUserRequest request);
        Task<ServiceResult<UserResponse>> UpdateMyRefundQrAsync(string userId, UpdateMyRefundQrRequest request);
        Task<ServiceResult<bool>> DeleteAsync(string id);

        // Refund QR List methods
        Task<ServiceResult<List<RefundQrItemResponse>>> GetMyRefundQrsAsync(string userId);
        Task<ServiceResult<RefundQrItemResponse>> CreateMyRefundQrAsync(string userId, UpsertRefundQrItemRequest request);
        Task<ServiceResult<RefundQrItemResponse>> UpdateMyRefundQrItemAsync(string userId, int id, UpsertRefundQrItemRequest request);
        Task<ServiceResult<bool>> SetDefaultMyRefundQrItemAsync(string userId, int id);
        Task<ServiceResult<bool>> DeleteMyRefundQrItemAsync(string userId, int id);
    }
}
