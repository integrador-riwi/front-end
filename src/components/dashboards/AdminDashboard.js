// frontend/src/components/dashboards/StaffDashboard.js
export default class AdminDashboard {
  constructor(user) {
    this.user = user;
  }

  renderAvatars(users) {
    const maxVisible = 3;
    const container = document.createElement("div");
    container.className = "app-avatar-group";

    users.slice(0, maxVisible).forEach((user) => {
      const img = document.createElement("img");
      img.src = user.avatar;
      img.alt = user.name;
      img.className = "app-avatar";
      container.appendChild(img);
    });

    if (users.length > maxVisible) {
      const more = document.createElement("span");
      more.className = "app-avatar-more";
      more.textContent = `+${users.length - maxVisible}`;
      container.appendChild(more);
    }

    return container.outerHTML;
  }

  render() {
    const users = [
      { name: "Ana", avatar: "https://i.pravatar.cc/40?img=1" },
      { name: "Carlos", avatar: "https://i.pravatar.cc/40?img=2" },
      { name: "Luisa", avatar: "https://i.pravatar.cc/40?img=3" },
      { name: "Mateo", avatar: "https://i.pravatar.cc/40?img=4" },
      { name: "Sofía", avatar: "https://i.pravatar.cc/40?img=5" },
    ];

    const container = document.querySelector(".app-avatar-group");

    if (!container) return;

    container.innerHTML = this.renderAvatars(users);
  }
}
