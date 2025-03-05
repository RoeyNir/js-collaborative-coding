const API_URL = "https://js-collaborative-coding-production.up.railway.app/";

// שליפת כל קטעי הקוד
export const fetchCodeBlocks = async () => {
    try {
        const response = await fetch(`${API_URL}/codeblocks`);
        if (!response.ok) throw new Error("Failed to fetch code blocks");
        return await response.json();
    } catch (error) {
        console.error("Error fetching code blocks:", error);
        return [];
    }
};

// שליפת קטע קוד לפי ID
export const fetchCodeBlockById = async (id) => {
    try {
        const response = await fetch(`${API_URL}/codeblock/${id}`);
        if (!response.ok) throw new Error("Failed to fetch code block");
        return await response.json();
    } catch (error) {
        console.error("Error fetching code block:", error);
        return null;
    }
};
 
