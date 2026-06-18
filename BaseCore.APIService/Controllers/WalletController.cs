using BaseCore.DTO;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/wallet")]
    public class WalletController : BaseApiController
    {
        private readonly IWalletService _walletService;

        public WalletController(IWalletService walletService)
        {
            _walletService = walletService;
        }

        [HttpGet("my-wallet")]
        public async Task<IActionResult> GetMyWallet()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Không xác định được danh tính người dùng." });

            var result = await _walletService.GetWalletByUserIdAsync(userId);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        [HttpGet("transactions")]
        public async Task<IActionResult> GetMyTransactions([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Không xác định được danh tính người dùng." });

            var result = await _walletService.GetMyTransactionsAsync(userId, page, pageSize);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        [HttpPost("deposit")]
        public async Task<IActionResult> RequestDeposit([FromBody] DepositRequestDto dto)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Không xác định được danh tính người dùng." });

            var result = await _walletService.RequestDepositAsync(userId, dto.Amount, dto.ReferenceId);
            if (!result.IsSuccess) 
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        [HttpPost("withdraw")]
        public async Task<IActionResult> RequestWithdraw([FromBody] WithdrawalRequestDto dto)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Không xác định được danh tính người dùng." });

            var result = await _walletService.RequestWithdrawalAsync(userId, dto.Amount, dto.RefundQrId);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("admin/pending-deposits")]
        public async Task<IActionResult> GetPendingDeposits([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _walletService.GetPendingDepositsAsync(GetActorType(), page, pageSize);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("admin/approve-deposit/{id}")]
        public async Task<IActionResult> ApproveDeposit(int id)
        {
            var adminId = GetUserId() ?? "SystemAdmin";
            var result = await _walletService.ApproveDepositAsync(GetActorType(), id, adminId);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(new { message = result.Message });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("admin/reject-deposit/{id}")]
        public async Task<IActionResult> RejectDeposit(int id)
        {
            var adminId = GetUserId() ?? "SystemAdmin";
            var result = await _walletService.RejectDepositAsync(GetActorType(), id, adminId);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(new { message = result.Message });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("admin/pending-withdrawals")]
        public async Task<IActionResult> GetPendingWithdrawals([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _walletService.GetPendingWithdrawalsAsync(GetActorType(), page, pageSize);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("admin/approve-withdrawal/{id}")]
        public async Task<IActionResult> ApproveWithdrawal(int id)
        {
            var adminId = GetUserId() ?? "SystemAdmin";
            var result = await _walletService.ApproveWithdrawalAsync(GetActorType(), id, adminId);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(new { message = result.Message });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("admin/reject-withdrawal/{id}")]
        public async Task<IActionResult> RejectWithdrawal(int id)
        {
            var adminId = GetUserId() ?? "SystemAdmin";
            var result = await _walletService.RejectWithdrawalAsync(GetActorType(), id, adminId);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(new { message = result.Message });
        }
    }
}
