from fastapi import APIRouter, HTTPException
from app.auth.schemas import OTPSendRequest, OTPVerifyRequest, TokenResponse
from app.config import get_settings

router = APIRouter()


@router.post("/send-otp")
async def send_otp(request: OTPSendRequest):
    settings = get_settings()
    if settings.mock_otp:
        return {"message": "OTP sent (mock)", "phone": request.phone}
    raise HTTPException(status_code=501, detail="Real MSG91 integration arrives in plan 01-02")


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(request: OTPVerifyRequest):
    settings = get_settings()
    if settings.mock_otp:
        if request.otp == "123456":
            return TokenResponse(access_token="mock_token", token_type="bearer")
        raise HTTPException(status_code=400, detail="Invalid OTP")
    raise HTTPException(status_code=501, detail="Real MSG91 integration arrives in plan 01-02")
