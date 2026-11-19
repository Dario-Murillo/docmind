namespace DocMind.Core.Embeddings;

public interface IEmbeddingService
{
    public string ModelId { get; }

    public Task<float[]> GenerateDocumentEmbeddingAsync(string text);

    public Task<float[]> GenerateQueryEmbeddingAsync(string question);
}
