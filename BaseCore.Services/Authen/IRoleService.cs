using BaseCore.DTO;
using BaseCore.Services.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services.Authen
{
    public interface IRoleService
    {
        Task<ServiceResult<List<RoleDto>>> GetAllAsync();
        Task<ServiceResult<RoleDto>> GetByIdAsync(int id);
        Task<ServiceResult<RoleDto>> GetByUserTypeAsync(int userType);
        Task<ServiceResult<RolePermissionsDto>> GetPermissionsAsync(int id);
    }
}
