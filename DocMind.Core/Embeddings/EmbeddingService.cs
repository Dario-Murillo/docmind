namespace DocMind.Core.Embeddings;


using Microsoft.Extensions.AI;
using OllamaSharp;

public class EmbeddingService(IEmbeddingGenerator<string, Embedding<float>> embeddingGenerator, Uri? endpoint = null, string modelId = EmbeddingService.DefaultModelId) : IEmbeddingService
{
    public const string DefaultModelId = "nomic-embed-text";
    private static readonly Uri DefaultEndpoint = new("http://localhost:11434");

    // nomic-embed-text was trained with these task prefixes. Changing them changes every vector,
    // so stored documents would have to be re-indexed.
    private const string DocumentPrefix = "search_document: ";
    private const string QueryPrefix = "search_query: ";

    private readonly IEmbeddingGenerator<string, Embedding<float>> embeddingGenerator = embeddingGenerator ?? throw new ArgumentNullException(nameof(embeddingGenerator));
    private readonly Uri endpoint = endpoint ?? DefaultEndpoint;

    public EmbeddingService(Uri? endpoint = null, string modelId = DefaultModelId)
        : this(new OllamaApiClient(endpoint ?? DefaultEndpoint, modelId), endpoint ?? DefaultEndpoint, modelId)
    {
    }

    public string ModelId { get; } = modelId;

    public Task<float[]> GenerateDocumentEmbeddingAsync(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            throw new ArgumentException("Text must not be null or empty.", nameof(text));
        }

        return this.GenerateAsync(DocumentPrefix + text);
    }

    public Task<float[]> GenerateQueryEmbeddingAsync(string question)
    {
        if (string.IsNullOrWhiteSpace(question))
        {
            throw new ArgumentException("Question must not be null or empty.", nameof(question));
        }

        return this.GenerateAsync(QueryPrefix + question);
    }

    private async Task<float[]> GenerateAsync(string prefixedText)
    {
        try
        {
            var embeddings = await this.embeddingGenerator.GenerateAsync([prefixedText]);
            return embeddings[0].Vector.ToArray();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new InvalidOperationException(
                $"Could not reach Ollama to generate the embedding. Ensure Ollama is running ('ollama serve') at {this.endpoint} and that the '{this.ModelId}' model is pulled ('ollama pull {this.ModelId}').",
                ex);
        }
    }
}
