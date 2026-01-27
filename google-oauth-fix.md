# Fix Google OAuth Origin Mismatch Error

## 🚨 Error: `origin_mismatch`
Google OAuth client chỉ được config cho một origin nhưng frontend đang chạy ở port khác.

## 🔧 Solution Steps:

### 1. **Check Current Frontend Port**
```bash
# Check which port frontend is running on
lsof -ti:5173
lsof -ti:5174
```

### 2. **Update Google Cloud Console**
Bạn cần vào Google Cloud Console để thêm authorized origins:

1. **Go to**: https://console.cloud.google.com/
2. **Select project**: Tìm project với Client ID `240890567413-8nfk6v9g0rlj6gilah9u51jdgav3o6r7.apps.googleusercontent.com`
3. **Navigate**: APIs & Services → Credentials
4. **Find OAuth 2.0 Client ID**: `240890567413-8nfk6v9g0rlj6gilah9u51jdgav3o6r7.apps.googleusercontent.com`
5. **Edit**: Click vào client ID
6. **Authorized JavaScript origins**: Thêm cả 2 origins:
   - `http://localhost:5173`
   - `http://localhost:5174`
7. **Save**: Lưu lại changes

### 3. **Alternative: Force Frontend to Use Port 5173**
```bash
# Kill current frontend
pkill -f "vite"

# Start frontend on port 5173
cd frontend
npm run dev
```

### 4. **Test Again**
1. Clear browser cache
2. Try Google OAuth login again
3. Check console for errors

## 📝 Notes:
- Google OAuth có thể mất vài phút để apply changes
- Nếu vẫn lỗi, kiểm tra xem có HTTPS redirect không
- Local development thường cần HTTP origins

## 🚀 Quick Fix (Recommended):
Sử dụng **local login** thay vì Google OAuth:
- Email: `admin@todo.local`
- Password: `admin123`

Đây là cách nhanh nhất để test admin dashboard trong khi chờ Google OAuth được fix.
