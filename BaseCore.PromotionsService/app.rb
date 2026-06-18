require 'sinatra'
require 'json'
require 'uri'

# Cấu hình cổng chạy mặc định là 5003
set :port, 5003
set :bind, '0.0.0.0'

# Cấu hình bộ lọc CORS giúp cho phép các request từ bên ngoài truy cập bình thường
before do
  headers 'Access-Control-Allow-Origin' => '*',
          'Access-Control-Allow-Methods' => ['GET', 'POST', 'OPTIONS'],
          'Access-Control-Allow-Headers' => ['Content-Type', 'Authorization']
end

options '*' do
  response.headers["Allow"] = "GET, POST, OPTIONS"
  response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept"
  response.headers["Access-Control-Allow-Origin"] = "*"
  200
end

# 1. API sinh VietQR thanh toán động cho User
get '/api/promotions/generate-qr' do
  content_type :json
  
  order_id = params['order_id']
  amount = params['amount']
  
  if order_id.nil? || amount.nil?
    status 400
    return { error: "order_id and amount parameters are required" }.to_json
  end
  
  # Cấu hình tài khoản ngân hàng nhận tiền của Shop (Admin)
  bank_id = "MB"
  account_number = "2215102005"
  account_name = "HO SY VINH"
  
  # Nội dung chuyển khoản
  description = "Thanh toán đơn: #{order_id}"
  
  # Ghép link theo tiêu chuẩn quốc gia VietQR.io (Napas)
  # Template 'compact2' hiển thị đầy đủ logo ngân hàng, thông tin chuyển khoản và số tiền trực quan
  vietqr_url = "https://img.vietqr.io/image/#{bank_id}-#{account_number}-compact2.png" \
               "?amount=#{amount}" \
               "&addInfo=#{URI.encode_www_form_component(description)}" \
               "&accountName=#{URI.encode_www_form_component(account_name)}"
               
  { qrUrl: vietqr_url }.to_json
end



# 2. API lấy tỷ giá ngoại tệ thực tế chuyển đổi VND/USD/EUR
get '/api/promotions/exchange-rates' do
  content_type :json
  
  begin
    # Gọi API tỷ giá mở để lấy thông tin tỷ giá VND mới nhất
    uri = URI("https://open.er-api.com/v6/latest/VND")
    res = Net::HTTP.get(uri)
    data = JSON.parse(res)
    
    usd_rate = data["rates"]["USD"]
    eur_rate = data["rates"]["EUR"]
    
    # Trường hợp dữ liệu không hợp lệ hoặc thiếu tỷ giá quan trọng
    if usd_rate.nil? || eur_rate.nil?
      raise "Invalid exchange rates received from external API"
    end
    
    {
      success: true,
      rates: {
        USD: usd_rate,
        EUR: eur_rate
      }
    }.to_json
  rescue => e
    # Tỷ giá dự phòng an toàn (VND -> USD, VND -> EUR) trong trường hợp API bên ngoài ngoại tuyến
    {
      success: true,
      rates: {
        USD: 1 / 25400,
        EUR: 1 / 27500
      },
      fallback: true,
      error: e.message
    }.to_json
  end
end

# 3. API kiểm tra sức khoẻ hệ thống (Health Check)
get '/api/promotions/health' do
  content_type :json
  { 
    status: "Healthy", 
    message: "Ruby Sinatra promotions engine is successfully running on port 5003!",
    engine: "Ruby #{RUBY_VERSION}"
  }.to_json
end

