using BaseCore.DTO;
using BaseCore.Services.Models;
using System.Threading.Tasks;

namespace BaseCore.Services.Authen
{
    public interface IAuthService
    {
        Task<ServiceResult<LoginResponse>> LoginAsync(LoginRequest request);
        Task<ServiceResult<string>> RegisterAsync(RegisterRequest request);
    }
}
