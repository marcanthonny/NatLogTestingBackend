function generateEmailContent(snapshot, template) {
  const content = `
    <h2>${template.template.title}</h2>
    <p>${template.template.intro}</p>
    <table border="1" style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <thead style="background-color: #f8f9fa;">
        <tr>
          <th style="padding: 8px; text-align: left;">Branch</th>
          <th style="padding: 8px; text-align: center;">IRA CC %</th>
          <th style="padding: 8px; text-align: center;">Cycle Count %</th>
        </tr>
      </thead>
      <tbody>
        ${snapshot.ccStats.branchPercentages.map((branch, index) => `
          <tr>
            <td style="padding: 8px;">${branch.branch}</td>
            <td style="padding: 8px; text-align: center;">${branch.percentage.toFixed(2).replace('.', ',')}%</td>
            <td style="padding: 8px; text-align: center;">${(snapshot.iraStats.branchPercentages[index]?.percentage || 0).toFixed(2).replace('.', ',')}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
    <p style="color: #666; font-style: italic;">${template.template.footer}</p>
  `;

  return content;
}

module.exports = { generateEmailContent };
