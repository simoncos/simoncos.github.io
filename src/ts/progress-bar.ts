document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.getElementById('reading-progress');
    
    // Calculate and update progress
    function updateProgress() {
        const winScroll = window.scrollY;
        const height = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = (winScroll / height) * 100;
        
        if (progressBar) {
            progressBar.style.width = scrolled + '%';
        }
    }

    // Update progress on scroll
    window.addEventListener('scroll', updateProgress);
    
    // Update progress on page load
    updateProgress();
    
    // Update progress on window resize
    window.addEventListener('resize', updateProgress);
}); 