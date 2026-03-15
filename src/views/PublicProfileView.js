export default class PublicProfileView {
    constructor(router) {
        this.router = router;
    }

    render() {
        const app = document.getElementById("app");
        app.innerHTML = `
            <div class="container">
                <h1>Public Profile</h1>
            </div>
        `;
    }
}