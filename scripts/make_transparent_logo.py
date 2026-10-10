import numpy as np
from PIL import Image, ImageFilter
from collections import deque

def process_logo(input_path, output_path):
    im = Image.open(input_path).convert('RGBA')
    width, height = im.size
    data = np.array(im, dtype=np.float32)
    
    rgb = data[:, :, :3]
    
    # Background color estimate from corners
    corner_pixels = np.array([rgb[0, 0], rgb[0, -1], rgb[-1, 0], rgb[-1, -1]])
    bg_color = corner_pixels.mean(axis=0)
    
    # Distance to dark background
    dist = np.linalg.norm(rgb - bg_color, axis=2)
    
    # Brightness
    brightness = rgb.mean(axis=2)
    
    # Outer background mask via flood fill from 4 corners and edges
    is_bg = np.zeros((height, width), dtype=bool)
    
    # A pixel is background candidate if brightness < 32 and color is close to dark gray
    # Teal colors have high green/blue (G > 70 or B > 70)
    is_dark = (brightness < 32) & (rgb[:, :, 1] < 50) & (rgb[:, :, 2] < 50)
    
    # Floodfill from borders
    queue = deque()
    for x in range(width):
        if is_dark[0, x]: queue.append((0, x)); is_bg[0, x] = True
        if is_dark[height-1, x]: queue.append((height-1, x)); is_bg[height-1, x] = True
    for y in range(height):
        if is_dark[y, 0]: queue.append((y, 0)); is_bg[y, 0] = True
        if is_dark[y, width-1]: queue.append((y, width-1)); is_bg[y, width-1] = True
        
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1,0), (1,0), (0,-1), (0,1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < height and 0 <= nx < width:
                if not is_bg[ny, nx] and is_dark[ny, nx]:
                    is_bg[ny, nx] = True
                    queue.append((ny, nx))
                    
    # Also remove the outer square bracket lines if user said 'jangan kotak'
    # Check the teal square box: it has straight vertical and horizontal lines near x=140, x=880, y=240, y=780
    # Let's see if we should create a circular mask or keep the ribbon loops:
    
    # Smooth alpha mask
    alpha = np.ones((height, width), dtype=np.float32) * 255.0
    alpha[is_bg] = 0.0
    
    # For pixels near the boundary, apply smooth anti-aliased edge
    mask_im = Image.fromarray((alpha).astype(np.uint8), mode='L')
    # Slight blur to soften transitions
    mask_im = mask_im.filter(ImageFilter.GaussianBlur(radius=1.2))
    
    im.putalpha(mask_im)
    im.save(output_path, 'PNG')
    print('Saved transparent logo to', output_path)

if __name__ == '__main__':
    process_logo('assets/logo.png', 'assets/logo_transparent.png')
