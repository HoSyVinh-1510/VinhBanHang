using BaseCore.DTO;
using BaseCore.Services.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services.Authen
{
    public class RoleService : IRoleService
    {
        private static readonly List<RoleDto> _roles = new()
        {
            new RoleDto { Id = 1, Name = "Admin", Description = "Administrator with full access", UserType = 1 },
            new RoleDto { Id = 2, Name = "User", Description = "Regular user with limited access", UserType = 0 },
            new RoleDto { Id = 3, Name = "Manager", Description = "Manager with moderate access", UserType = 2 }
        };

        public Task<ServiceResult<List<RoleDto>>> GetAllAsync()
        {
            return Task.FromResult(ServiceResult<List<RoleDto>>.Success(_roles));
        }

        public Task<ServiceResult<RoleDto>> GetByIdAsync(int id)
        {
            var role = _roles.Find(r => r.Id == id);
            if (role == null)
                return Task.FromResult(ServiceResult<RoleDto>.Error("Role not found"));

            return Task.FromResult(ServiceResult<RoleDto>.Success(role));
        }

        public Task<ServiceResult<RoleDto>> GetByUserTypeAsync(int userType)
        {
            var role = _roles.Find(r => r.UserType == userType);
            if (role == null)
                return Task.FromResult(ServiceResult<RoleDto>.Error("Role not found for this UserType"));

            return Task.FromResult(ServiceResult<RoleDto>.Success(role));
        }

        public Task<ServiceResult<RolePermissionsDto>> GetPermissionsAsync(int id)
        {
            var role = _roles.Find(r => r.Id == id);
            if (role == null)
                return Task.FromResult(ServiceResult<RolePermissionsDto>.Error("Role not found"));

            var permissions = role.UserType switch
            {
                1 => new[] { "users.read", "users.write", "users.delete", "products.read", "products.write", "products.delete", "orders.read", "orders.write", "orders.delete", "categories.read", "categories.write", "categories.delete", "roles.read", "roles.write" },
                2 => new[] { "users.read", "products.read", "products.write", "orders.read", "orders.write", "categories.read" },
                _ => new[] { "products.read", "orders.read", "categories.read" }
            };

            var dto = new RolePermissionsDto
            {
                Role = role.Name,
                Permissions = permissions
            };

            return Task.FromResult(ServiceResult<RolePermissionsDto>.Success(dto));
        }
    }
}
