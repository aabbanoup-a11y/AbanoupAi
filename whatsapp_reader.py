المحتوى الكامل للملف
```python
import pytesseract
from PIL import Image

def read_screen():
    # افتح الشاشة
    [[PHONE:open_app|com.whatsapp]]
    
    # خذ صورة للشاشة
    [[PHONE:screenshot]]
    
    # اقرأ النص من الصورة
    text = pytesseract.image_to_string(Image.open('screenshot.png'))
    
    return text

print(read_screen())
