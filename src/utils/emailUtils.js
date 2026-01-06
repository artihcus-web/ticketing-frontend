import { apiRequest } from './api.js';
 
// NOTE: The 'project' field in user documents should always be an array of project names, even if the user is in only one project (e.g., ['VMM']).
export const fetchProjectMemberEmails = async (projectName) => {
  if (!projectName) return [];
  try {
    const response = await apiRequest(`/tickets/projects/${encodeURIComponent(projectName)}/member-emails`, {
      method: 'GET',
    });
    
    if (response.success && response.emails) {
      return response.emails;
    }
    return [];
  } catch (error) {
    console.error("Error fetching project member emails:", error);
    return [];
  }
};
 
 