import os
import io
import re
import random
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.exceptions import ValidationError

ALLOWED_MIME_TYPES = {
    # Images
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/gif': 'image',
    'image/webp': 'image',
    'image/svg+xml': 'image',
    # Videos
    'video/mp4': 'video',
    'video/webm': 'video',
    'video/quicktime': 'video',
    'video/x-matroska': 'video',
    # Audio
    'audio/mpeg': 'audio',
    'audio/ogg': 'audio',
    'audio/wav': 'audio',
    'audio/webm': 'voice',
    'audio/x-m4a': 'audio',
    'audio/mp4': 'audio',
    # Documents
    'application/pdf': 'document',
    'application/msword': 'document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
    'application/vnd.ms-excel': 'document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
    'application/vnd.ms-powerpoint': 'document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
    'text/plain': 'document',
    'text/csv': 'document',
    'application/zip': 'document',
    'application/x-rar-compressed': 'document',
    'application/x-7z-compressed': 'document',
}

MAX_FILE_SIZES = {
    'image': 15 * 1024 * 1024,      # 15 MB
    'video': 50 * 1024 * 1024,      # 50 MB
    'audio': 25 * 1024 * 1024,      # 25 MB
    'voice': 25 * 1024 * 1024,      # 25 MB
    'document': 50 * 1024 * 1024,   # 50 MB
    'other': 50 * 1024 * 1024,      # 50 MB
}

def validate_and_classify_file(file_obj):
    """
    Validates file MIME type, extension, and file size.
    Returns classified media_type ('image', 'video', 'audio', 'voice', 'document').
    """
    content_type = getattr(file_obj, 'content_type', 'application/octet-stream')
    file_size = getattr(file_obj, 'size', 0)
    
    # Classify by content_type or file extension
    media_type = ALLOWED_MIME_TYPES.get(content_type)
    if not media_type:
        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
            media_type = 'image'
        elif ext in ['.mp4', '.webm', '.mov', '.mkv']:
            media_type = 'video'
        elif ext in ['.mp3', '.wav', '.ogg', '.m4a']:
            media_type = 'audio'
        elif ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar']:
            media_type = 'document'
        else:
            media_type = 'other'

    max_size = MAX_FILE_SIZES.get(media_type, 50 * 1024 * 1024)
    if file_size > max_size:
        raise ValidationError(f"File size exceeds limit of {max_size // (1024 * 1024)}MB for {media_type} files.")

    return media_type

def generate_image_thumbnail(image_file, max_size=(300, 300)):
    """
    Generate compressed thumbnail for image uploads using PIL.
    """
    try:
        image = Image.open(image_file)
        # Convert RGBA/P to RGB if JPEG
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        image.thumbnail(max_size, Image.Resampling.LANCZOS)

        thumb_io = io.BytesIO()
        image.save(thumb_io, format='JPEG', quality=80)
        thumb_io.seek(0)

        thumb_name = 'thumb_' + os.path.splitext(image_file.name)[0] + '.jpg'
        return InMemoryUploadedFile(
            thumb_io, None, thumb_name, 'image/jpeg', thumb_io.tell(), None
        )
    except Exception as e:
        print(f"Thumbnail generation error: {e}")
        return None

def generate_voice_waveform_data(duration_seconds=10, samples=40):
    """
    Generate normalized audio waveform bars (values 10-100) for visualizer.
    """
    waveform = []
    current = 45
    for _ in range(samples):
        delta = random.randint(-15, 15)
        current = max(10, min(100, current + delta))
        waveform.append(current)
    return waveform

def extract_urls_from_text(text):
    """Extract all URLs from a text string."""
    url_pattern = r'(https?://[^\s]+)'
    return re.findall(url_pattern, text)
