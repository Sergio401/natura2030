import numpy as np


class LBMChannel:
    """D2Q9 BGK lattice-Boltzmann model for a two-sided vegetated channel."""

    W = np.array(
        [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36],
        dtype=float,
    )
    CX = np.array([0, 1, 0, -1, 0, 1, -1, -1, 1], dtype=int)
    CY = np.array([0, 0, 1, 0, -1, 1, 1, -1, -1], dtype=int)
    OPP = np.array([0, 3, 4, 1, 2, 7, 8, 5, 6], dtype=int)
    SPECULAR_Y = np.array([0, 1, 4, 3, 2, 8, 7, 6, 5], dtype=int)
    CYLINDERS_PER_SIDE = {"Low": 45, "High": 90}

    def __init__(
        self,
        nx=220,
        ny=80,
        omega=1.70,
        u_in=0.06,
        channel_width=28,
        density="Low",
        cylinder_radius=2,
        seed=42,
        vegetation_x=(50, 185),
    ):
        self.nx = int(nx)
        self.ny = int(ny)
        self.omega = float(omega)
        self.u_in = float(u_in)
        self.channel_width = int(channel_width)
        self.density = density
        self.cylinder_radius = int(cylinder_radius)
        self.seed = int(seed)
        self.vegetation_x = tuple(vegetation_x)
        self.timestep = 0
        self.build_obstacles()
        self.reset_flow()

    def equilibrium(self, rho, ux, uy):
        cu = 3.0 * (
            self.CX[:, None, None] * ux[None, :, :]
            + self.CY[:, None, None] * uy[None, :, :]
        )
        u2 = ux**2 + uy**2
        return self.W[:, None, None] * rho[None, :, :] * (
            1.0 + cu + 0.5 * cu**2 - 1.5 * u2[None, :, :]
        )

    def _place_cylinders(self, cylinders, side, target, rng):
        radius = self.cylinder_radius
        x0, x1 = self.vegetation_x
        y_mid = 0.5 * (self.ny - 1)
        half_channel = 0.5 * self.channel_width

        if side == "lower":
            y_min = 2 + radius
            y_max = int(np.floor(y_mid - half_channel)) - radius - 2
        else:
            y_min = int(np.ceil(y_mid + half_channel)) + radius + 2
            y_max = self.ny - 3 - radius

        x_min = x0 + radius
        x_max = x1 - radius - 1
        if y_max <= y_min or x_max <= x_min:
            return

        centers = []
        minimum_separation = (2 * radius + 1) ** 2
        attempts = 0
        while len(centers) < target and attempts < 100 * target:
            attempts += 1
            x = int(rng.integers(x_min, x_max + 1))
            y = int(rng.integers(y_min, y_max + 1))
            if centers:
                existing = np.asarray(centers)
                distance_squared = (existing[:, 0] - x) ** 2 + (existing[:, 1] - y) ** 2
                if np.any(distance_squared < minimum_separation):
                    continue
            centers.append((x, y))

        for x, y in centers:
            yy0, yy1 = y - radius, y + radius + 1
            xx0, xx1 = x - radius, x + radius + 1
            yy, xx = np.ogrid[yy0:yy1, xx0:xx1]
            disk = (xx - x) ** 2 + (yy - y) ** 2 <= radius**2
            cylinders[yy0:yy1, xx0:xx1] |= disk

    def build_obstacles(self):
        cylinders = np.zeros((self.ny, self.nx), dtype=bool)
        slip_walls = np.zeros((self.ny, self.nx), dtype=bool)
        slip_walls[0, :] = True
        slip_walls[-1, :] = True

        rng = np.random.default_rng(self.seed)
        count = self.CYLINDERS_PER_SIDE[self.density]
        self._place_cylinders(cylinders, "lower", count, rng)
        self._place_cylinders(cylinders, "upper", count, rng)

        self.cylinders = cylinders
        self.slip_walls = slip_walls
        self.obstacles = cylinders | slip_walls

    def reset_flow(self):
        self.rho = np.ones((self.ny, self.nx), dtype=float)
        self.ux = np.full((self.ny, self.nx), self.u_in, dtype=float)
        self.uy = np.zeros((self.ny, self.nx), dtype=float)
        self.ux[self.obstacles] = 0.0
        self.uy[self.obstacles] = 0.0
        self.f = self.equilibrium(self.rho, self.ux, self.uy)
        self.timestep = 0

    def configure(self, u_in, channel_width, density):
        geometry_changed = self.channel_width != int(channel_width) or self.density != density
        self.u_in = float(u_in)
        if geometry_changed:
            self.channel_width = int(channel_width)
            self.density = density
            self.build_obstacles()
            self.reset_flow()

    def _update_macroscopic(self):
        self.rho = np.maximum(np.sum(self.f, axis=0), 1e-12)
        self.ux = np.sum(self.f * self.CX[:, None, None], axis=0) / self.rho
        self.uy = np.sum(self.f * self.CY[:, None, None], axis=0) / self.rho
        self.ux[self.obstacles] = 0.0
        self.uy[self.obstacles] = 0.0

    def step(self, steps=1):
        for _ in range(int(steps)):
            rho = np.maximum(np.sum(self.f, axis=0), 1e-12)
            ux = np.sum(self.f * self.CX[:, None, None], axis=0) / rho
            uy = np.sum(self.f * self.CY[:, None, None], axis=0) / rho
            ux[self.obstacles] = 0.0
            uy[self.obstacles] = 0.0

            equilibrium = self.equilibrium(rho, ux, uy)
            post_collision = self.f - self.omega * (self.f - equilibrium)
            streamed = np.empty_like(self.f)
            for direction in range(9):
                streamed[direction] = np.roll(
                    np.roll(post_collision[direction], self.CX[direction], axis=1),
                    self.CY[direction],
                    axis=0,
                )

            next_distribution = streamed.copy()
            for direction in range(9):
                next_distribution[direction, self.cylinders] = streamed[
                    self.OPP[direction], self.cylinders
                ]
                next_distribution[direction, self.slip_walls] = streamed[
                    self.SPECULAR_Y[direction], self.slip_walls
                ]

            rho_in = np.ones((self.ny, 1), dtype=float)
            ux_in = np.full((self.ny, 1), self.u_in, dtype=float)
            uy_in = np.zeros((self.ny, 1), dtype=float)
            inlet = self.equilibrium(rho_in, ux_in, uy_in)[:, :, 0]
            fluid_left = ~self.obstacles[:, 0]
            next_distribution[:, fluid_left, 0] = inlet[:, fluid_left]

            fluid_right = ~self.obstacles[:, -1]
            next_distribution[:, fluid_right, -1] = next_distribution[:, fluid_right, -2]
            self.f = next_distribution

        self.timestep += int(steps)
        self._update_macroscopic()

    def speed(self):
        return np.sqrt(self.ux**2 + self.uy**2)

    def vorticity(self):
        return np.gradient(self.uy, axis=1) - np.gradient(self.ux, axis=0)


simulation = None


def initialize_simulation(u_in=0.06, channel_width=28, density="Low"):
    global simulation
    simulation = LBMChannel(
        nx=220,
        ny=80,
        omega=1.70,
        u_in=float(u_in),
        channel_width=int(channel_width),
        density=density,
        cylinder_radius=2,
        vegetation_x=(50, 185),
    )


def configure_simulation(u_in, channel_width, density):
    simulation.configure(float(u_in), int(channel_width), density)


def reset_simulation():
    simulation.reset_flow()


def simulation_frame(steps, field):
    if int(steps) > 0:
        simulation.step(int(steps))

    speed = simulation.speed()
    displayed = speed if field == "speed" else simulation.vorticity()
    fluid = ~simulation.obstacles
    fluid_speed = speed[fluid]

    return {
        "width": simulation.nx,
        "height": simulation.ny,
        "field": field,
        "data": displayed.astype(np.float32).ravel(),
        "obstacles": simulation.obstacles.astype(np.uint8).ravel(),
        "timestep": simulation.timestep,
        "meanSpeed": float(np.mean(fluid_speed)),
        "peakSpeed": float(np.max(fluid_speed)),
    }
