from app.core.exceptions import AppException


class ProfileNotFoundException(AppException):
    def __init__(self, role: str = "user"):
        super().__init__(f"{role.capitalize()} profile not found", status_code=404)


class InvalidImageException(AppException):
    def __init__(self):
        super().__init__("Invalid image file. Only JPEG, PNG, and GIF are allowed.", status_code=400)


class ImageUploadException(AppException):
    def __init__(self):
        super().__init__("Failed to upload image", status_code=500)
