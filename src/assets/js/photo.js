import ImgsInfo from "../json/imgs.json";

class Photo {
    constructor() {
        this.container = document.getElementById("photo-content");
    }
    render() {
        const start = 0;
        const post = ImgsInfo.post_list.slice(start);
        const imgs = [];
        const userId = 1045209;
        // t g s m mr l lr ft640 f
        const size = "s";

        post.forEach(item => {
            item.images.forEach(image => {
                imgs.push(image.img_id);
            });
        });
        const id = 17385233;
        const ids = [17385233];
        // const getTemp = "https://simmzl.tuchong.com/rest/2/sites/1045209/posts?count=50&page=1&before_timestamp=0";
        ids.forEach(item => {
        // imgs.forEach(item => {
            const img = new Image();
            img.src = `https://photo.tuchong.com/${userId}/${size}/${item}.jpg`;
            img.height = "100%";
            img.style.padding = "10px";
            // img.height = 200;
            // console.log(img);
            this.container.appendChild(img);
            // const span = document.createElement("span");
            // span.innerText = item;
            // document.body.appendChild(span);
        });
    }
}

const drawer = new Photo();
drawer.render();