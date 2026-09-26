import type { ImageMetadata } from 'astro';
import pnudEcuador from '../assets/collaborators/pnud-ecuador.jpg';
import defreesLab from '../assets/collaborators/defrees-hydraulics-lab.jpg';
import coastalSolutions from '../assets/collaborators/coastal-solutions.jpg';

export interface Collaborator {
  name: string;
  logo: ImageMetadata;
}

// Nombres propios: iguales en ambos idiomas, por eso no viven en content.<locale>.ts.
export const collaborators: Collaborator[] = [
  { name: 'Programa de las Naciones Unidas para el Desarrollo (PNUD) – Ecuador', logo: pnudEcuador },
  { name: 'DeFrees Hydraulics Lab, Cornell University', logo: defreesLab },
  { name: 'Coastal Solutions Fellows Program', logo: coastalSolutions },
];
