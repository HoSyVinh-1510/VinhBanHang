using BaseCore.DTO;
using BaseCore.Entities;
using BaseCore.Services.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface ICustomerAddressService
    {
        Task<ServiceResult<List<CustomerAddress>>> GetMyAddressesAsync(string userId);
        Task<ServiceResult<CustomerAddress>> CreateAsync(string userId, AddressDto dto);
        Task<ServiceResult<CustomerAddress>> UpdateAsync(string userId, int id, AddressDto dto);
        Task<ServiceResult<CustomerAddress>> SetDefaultAsync(string userId, int id);
        Task<ServiceResult<bool>> DeleteAsync(string userId, int id);
    }
}
