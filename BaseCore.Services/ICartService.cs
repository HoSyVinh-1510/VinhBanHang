using BaseCore.DTO;
using BaseCore.Entities;
using BaseCore.Services.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface ICartService
    {
        Task<ServiceResult<List<CartItem>>> GetMyCartAsync(string userId);
        Task<ServiceResult<CartItem>> SetQuantityAsync(string userId, SetCartQuantityDto dto);
        Task<ServiceResult<bool>> RemoveAsync(string userId, int productId);
        Task<ServiceResult<bool>> ClearAsync(string userId);
    }
}
