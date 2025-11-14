export const Table = ({ config }) => {
    const {rows, columns} = config

    return (
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        {columns.map((col, colIndex) => (
                            <th 
                                key={typeof col.key === 'string' || typeof col.key === 'number' ? col.key : colIndex}
                                scope="col" 
                                className="px-6 py-3"
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr 
                        key={row.id ?? rowIndex}
                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            {columns.map((col, colIndex) => {
                                    // Usa col.key si existe, sino colIndex para la clave de celda
                                    const colKey = col.key ?? colIndex;
                                    const cellKey = `${row.id ?? rowIndex}-${colKey}`;
                                    if (col.cell) {
                                        return (
                                            <td key={cellKey} className="px-6 py-4">
                                            {col.cell(row)}
                                            </td>
                                        )
                                    }

                                    if (colIndex === 0) {
                                        return (
                                            <th
                                                key={cellKey}
                                                scope="row"
                                                className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                                            >
                                            {col.key ? row[col.key] : null} 
                                            </th>
                                        )
                                    }

                                    return (
                                        <td key={cellKey} className="px-6 py-4">
                                            {col.key ? row[col.key] : null}
                                        </td>
                                    )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
