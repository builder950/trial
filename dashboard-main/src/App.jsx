import React, { useState, useEffect } from 'react';
import Spinner from './Spinner'; // Assuming you have a spinner component

const App = () => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        setHasError(false);
        try {
            const response = await fetch('YOUR_API_ENDPOINT');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();
            setData(result);
        } catch (error) {
            setHasError(true);
            console.error('Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRetry = () => {
        fetchData();
    };

    if (isLoading) {
        return <Spinner />; // Show loading spinner
    }

    if (hasError) {
        return (
            <div>
                <p>Oops! Something went wrong while fetching data.</p>
                <button onClick={handleRetry}>Retry</button>
            </div>
        ); // Show error message with retry button
    }

    return (
        <div>
            {/* Render your data here */}
            <h1>Data Loaded Successfully</h1>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
};

export default App;