from app.core.exceptions import AppException


class ChatException(AppException):
    def __init__(self, message: str = "Chat error", status_code: int = 400):
        super().__init__(message, status_code=status_code)


class ChatAccessDeniedException(ChatException):
    def __init__(self, message: str = "You do not have access to this course chat"):
        super().__init__(message, status_code=403)


class ChatOfferingNotFoundException(ChatException):
    def __init__(self):
        super().__init__("Course offering not found", status_code=404)


class ChatAttachmentException(ChatException):
    def __init__(self, message: str = "Invalid chat attachment"):
        super().__init__(message, status_code=400)
